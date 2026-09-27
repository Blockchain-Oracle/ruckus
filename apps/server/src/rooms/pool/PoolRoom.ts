import { type Client, Room, ServerError } from 'colyseus';

import {
  type AimUpdate,
  type OverEvent,
  type PlayedEvent,
  POOL_MSG,
  POOL_PHASE,
  POOL_PLAYERS,
  POOL_SEAT,
  POOL_WATCHER,
  type PoolJoinOptions,
  type PoolRackState,
  PoolRoomState,
  PoolSeat,
  type RackEvent,
  type ShotRequest,
  tableBytes,
} from '@arena/protocol/pool';
import { PROTOCOL_VERSION } from '@arena/shared';
import {
  applyOutcome,
  type Balls,
  botShot,
  CUE_BALL,
  canPlaceCue,
  F,
  judgeShot,
  newRack,
  onEight,
  onTable,
  PoolSim,
  type RackState,
  rack,
  set,
} from '@arena/sim-pool';

import { PROTOCOL_MISMATCH, releaseCode, uniqueCode } from '../codes.ts';
import {
  dropOrphanBots,
  GRACE_LOBBY_S,
  GRACE_MATCH_S,
  HOST_HANDOVER_MS,
  nextHost,
  reclaim,
  returningSeat,
  takeOver,
  validPlayerId,
} from '../lobby.ts';
import {
  AIM_MIN_INTERVAL_MS,
  BOT_DIFFICULTY,
  BOT_THINK_MS,
  MAX_CLIENTS,
  MAX_NAME_LENGTH,
  OVER_MS,
  STROKE_MS,
} from './config.ts';

type Seat = InstanceType<typeof PoolSeat>;

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const snapshot = (r: RackState): PoolRackState => ({
  ...r,
  groups: [...r.groups] as PoolRackState['groups'],
});

/**
 * Server-authoritative 8-ball. The shooter sends only the shot; the server plays it on the same
 * deterministic engine the clients run, judges it, and broadcasts the shot with the exact table
 * before and after. Bots are labelled seats that search with the real engine. Watchers are welcome
 * any time and take a free seat at the next rack.
 */
export class PoolRoom extends Room<{ state: InstanceType<typeof PoolRoomState> }> {
  override maxClients = MAX_CLIENTS;
  override state = new PoolRoomState();
  private balls: Balls = rack(1);
  private rackState: RackState = newRack(0);
  private seed = 1;
  private busy = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private lastAim = new Map<string, number>();
  private breaker: 0 | 1 = 0;

  override async onCreate(options: PoolJoinOptions) {
    this.roomId = await uniqueCode(this.presence);
    this.state.code = this.roomId;
    this.state.protocolVersion = PROTOCOL_VERSION;
    if (options.private) await this.setPrivate(true);
    this.seed = Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;

    this.onMessage(POOL_MSG.ready, (client, ready: unknown) => {
      const seat = this.seatOf(client);
      if (seat && this.state.phase === POOL_PHASE.lobby) seat.ready = Boolean(ready);
    });
    this.onMessage(POOL_MSG.addBot, (client) => this.hostOnly(client, () => this.addBot()));
    this.onMessage(POOL_MSG.removeBot, (client) => this.hostOnly(client, () => this.removeBot()));
    this.onMessage(POOL_MSG.start, (client) => this.hostOnly(client, () => this.startRack()));
    this.onMessage(POOL_MSG.shot, (client, req: ShotRequest) => this.onShot(client, req));
    this.onMessage(POOL_MSG.aim, (client, a: AimUpdate) => this.onAim(client, a));
  }

  override onAuth(_client: Client, options: PoolJoinOptions) {
    if (options.protocolVersion !== PROTOCOL_VERSION)
      throw new ServerError(PROTOCOL_MISMATCH, 'Client protocol is out of date: reload the page.');
    return true;
  }

  override onJoin(client: Client, options: PoolJoinOptions) {
    const inPlay = this.state.phase !== POOL_PHASE.lobby;
    const name = (options.name || 'Guest').slice(0, MAX_NAME_LENGTH);
    const playerId = validPlayerId(options.playerId);
    // A reload, new tab or late return takes the player's own seat back (ADR-009).
    const back = returningSeat(this.state.seats, playerId);
    if (back) {
      const wasHost = back.sessionId !== '' && back.sessionId === this.state.hostSessionId;
      reclaim(back, client.sessionId, name);
      if (wasHost || !this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
      if (inPlay) client.send(POOL_MSG.rack, this.rackEvent());
      return;
    }
    const slot = inPlay ? POOL_WATCHER : this.freeSlot();
    const seat = new PoolSeat();
    seat.slot = slot === -1 ? POOL_WATCHER : slot;
    seat.kind = seat.slot === POOL_WATCHER ? POOL_SEAT.waiting : POOL_SEAT.human;
    seat.sessionId = client.sessionId;
    seat.name = name;
    seat.playerId = playerId;
    this.state.seats.push(seat);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    if (this.clients.length >= MAX_CLIENTS) void this.lock();
    // Mid-rack: bring the watcher's table up to date.
    if (inPlay) client.send(POOL_MSG.rack, this.rackEvent());
  }

  /**
   * Hold the seat while the phone comes back (not awaited: when the grace runs out, Colyseus calls
   * onLeave itself, which releases the seat exactly once).
   */
  override onDrop(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    seat.connected = false;
    const grace = this.state.phase === POOL_PHASE.lobby ? GRACE_LOBBY_S : GRACE_MATCH_S;
    this.allowReconnection(client, grace).catch(() => {});
    if (this.state.hostSessionId === client.sessionId)
      this.after(HOST_HANDOVER_MS, () => {
        if (this.state.hostSessionId === client.sessionId && !this.seatOf(client)?.connected)
          this.state.hostSessionId = nextHost(this.state.seats) || this.state.hostSessionId;
      });
  }

  override onReconnect(client: Client) {
    const seat = this.seatOf(client);
    if (seat) seat.connected = true;
    if (this.state.phase !== POOL_PHASE.lobby) client.send(POOL_MSG.rack, this.rackEvent());
  }

  override onLeave(client: Client) {
    this.lastAim.delete(client.sessionId);
    this.release(client);
  }

  override async onDispose() {
    for (const t of this.timers) clearTimeout(t);
    await releaseCode(this.presence, this.roomId);
  }

  // ── seats ─────────────────────────────────────────────────────────────

  private seatOf(client: Client): Seat | undefined {
    return this.state.seats.find((s) => s.sessionId === client.sessionId);
  }

  private player(slot: number): Seat | undefined {
    return this.state.seats.find((s) => s.slot === slot);
  }

  private freeSlot(): number {
    for (let slot = 0; slot < POOL_PLAYERS; slot++) if (!this.player(slot)) return slot;
    return -1;
  }

  private hostOnly(client: Client, run: () => void) {
    if (client.sessionId === this.state.hostSessionId && this.state.phase === POOL_PHASE.lobby)
      run();
  }

  private addBot() {
    const slot = this.freeSlot();
    if (slot < 0) return;
    const seat = new PoolSeat();
    seat.slot = slot;
    seat.kind = POOL_SEAT.bot;
    seat.name = 'Bot · Shark';
    seat.ready = true;
    this.state.seats.push(seat);
  }

  private removeBot() {
    const i = this.state.seats.findIndex((s) => s.kind === POOL_SEAT.bot);
    if (i >= 0) this.state.seats.splice(i, 1);
  }

  /** Leaving mid-rack hands the seat to a labelled bot; in the lobby the seat simply frees up. */
  private release(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    if (this.state.phase === POOL_PHASE.lobby || seat.kind === POOL_SEAT.waiting) {
      this.state.seats.splice(this.state.seats.indexOf(seat), 1);
    } else {
      takeOver(seat);
      // If it was their turn, the bot takes it.
      if (this.rackState.shooter === seat.slot) this.maybeBotTurn();
    }
    if (this.state.hostSessionId === client.sessionId)
      this.state.hostSessionId = nextHost(this.state.seats, client.sessionId);
    if (this.clients.length < MAX_CLIENTS) void this.unlock();
  }

  // ── rack flow ─────────────────────────────────────────────────────────

  private after(ms: number, run: () => void) {
    this.timers.push(setTimeout(run, ms));
  }

  private rackEvent(): RackEvent {
    const a = this.player(0);
    const b = this.player(1);
    return {
      seed: this.seed,
      breaker: this.breaker,
      names: [a?.name ?? 'Player 1', b?.name ?? 'Player 2'],
      bots: [a?.kind === POOL_SEAT.bot, b?.kind === POOL_SEAT.bot],
      rack: snapshot(this.rackState),
      balls: tableBytes(this.balls),
    };
  }

  private startRack() {
    const a = this.player(0);
    const b = this.player(1);
    if (!a || !b) return;
    if (
      ![a, b].every(
        (s) => s.ready || s.sessionId === this.state.hostSessionId || s.kind === POOL_SEAT.bot,
      )
    )
      return;
    this.seed = Math.imul(this.seed ^ (this.state.racks + 1), 2654435761) >>> 0 || 1;
    this.balls = rack(this.seed);
    this.rackState = newRack(this.breaker);
    this.state.racks += 1;
    this.state.phase = POOL_PHASE.playing;
    this.busy = false;
    this.broadcast(POOL_MSG.rack, this.rackEvent());
    this.maybeBotTurn();
  }

  private onAim(client: Client, a: AimUpdate) {
    const seat = this.seatOf(client);
    if (!seat || seat.slot !== this.rackState.shooter || this.state.phase !== POOL_PHASE.playing)
      return;
    const now = Date.now();
    if (now - (this.lastAim.get(client.sessionId) ?? 0) < AIM_MIN_INTERVAL_MS) return;
    this.lastAim.set(client.sessionId, now);
    if (![a?.dx, a?.dy, a?.power, a?.spinX, a?.spinY].every(finite)) return;
    this.broadcast(POOL_MSG.aim, a, { except: client });
  }

  private onShot(client: Client, req: ShotRequest) {
    const seat = this.seatOf(client);
    const ok =
      seat?.kind === POOL_SEAT.human &&
      seat.slot === this.rackState.shooter &&
      this.play(req, false);
    // The shooter already started it rolling locally: a refused shot must resync their table.
    if (!ok && this.state.phase !== POOL_PHASE.lobby) client.send(POOL_MSG.rack, this.rackEvent());
  }

  /**
   * Validate, play to rest, judge, broadcast: the one place a shot becomes real. Shots resolve
   * instantly here; `busy` only paces bot turns so they wait for clients to finish watching.
   */
  private play(req: ShotRequest, bot: boolean): boolean {
    if ((bot && this.busy) || this.state.phase !== POOL_PHASE.playing || this.rackState.winner >= 0)
      return false;
    const s = req?.shot;
    if (!s || ![s.dx, s.dy, s.power, s.spinX, s.spinY].every(finite)) return false;
    if (s.dx === 0 && s.dy === 0) return false;
    const shot = {
      dx: s.dx,
      dy: s.dy,
      power: Math.min(1, Math.max(0, s.power)),
      spinX: Math.min(1, Math.max(-1, s.spinX)),
      spinY: Math.min(1, Math.max(-1, s.spinY)),
    };
    const r = this.rackState;
    let place = null as ShotRequest['place'];
    if (r.ballInHand !== 'none' && req.place && finite(req.place.x) && finite(req.place.y)) {
      if (canPlaceCue(this.balls, req.place.x, req.place.y, r.ballInHand)) {
        place = { x: req.place.x, y: req.place.y };
        set(this.balls, CUE_BALL, F.x, place.x);
        set(this.balls, CUE_BALL, F.y, place.y);
        set(this.balls, CUE_BALL, F.pocket, -1);
      }
    }
    const called =
      Number.isInteger(req.calledPocket) && req.calledPocket >= 0 && req.calledPocket < 6
        ? req.calledPocket
        : -1;
    if (onEight(r, this.balls) && called < 0 && !bot) return false;
    this.busy = true;
    const before = new Float64Array(this.balls);
    const sim = new PoolSim(this.balls);
    sim.shoot(shot);
    sim.runToRest();
    const out = judgeShot(r, before, this.balls, sim.events, called);
    const shooter = r.shooter;
    applyOutcome(r, this.balls, out);
    const potted: number[] = [];
    for (let i = 1; i <= 15; i++) if (!onTable(this.balls, i)) potted.push(i);
    const played: PlayedEvent = {
      shooter,
      bot,
      request: { shot, place, calledPocket: called },
      before: tableBytes(before),
      after: tableBytes(this.balls),
      rack: snapshot(r),
      message: out.message,
      potted,
    };
    this.broadcast(POOL_MSG.played, played);
    // Let clients watch it roll before the next turn opens (the replay takes its real duration).
    const replayMs = (sim.stepIndex / 512) * 1000 + (bot ? STROKE_MS : 0) + 400;
    const rackNo = this.state.racks;
    this.after(replayMs, () => {
      if (rackNo !== this.state.racks) return;
      this.busy = false;
      if (r.winner === 0 || r.winner === 1) this.endRack(r.winner);
      else this.maybeBotTurn();
    });
    return true;
  }

  private maybeBotTurn() {
    const seat = this.player(this.rackState.shooter);
    if (seat?.kind !== POOL_SEAT.bot || this.state.phase !== POOL_PHASE.playing) return;
    this.after(BOT_THINK_MS, () => {
      if (this.busy || this.player(this.rackState.shooter)?.kind !== POOL_SEAT.bot) return;
      const d = botShot(
        this.balls,
        this.rackState,
        BOT_DIFFICULTY,
        (this.seed ^ (Date.now() & 0xffff)) >>> 0,
      );
      this.play({ shot: d.shot, place: d.place, calledPocket: d.calledPocket }, true);
    });
  }

  private endRack(winner: 0 | 1) {
    const seat = this.player(winner);
    if (seat) seat.wins += 1;
    this.state.phase = POOL_PHASE.over;
    const over: OverEvent = {
      winner,
      wins: [this.player(0)?.wins ?? 0, this.player(1)?.wins ?? 0],
    };
    this.broadcast(POOL_MSG.over, over);
    // Loser breaks next (the usual winner-breaks feels unfair against a bot).
    this.breaker = (1 - winner) as 0 | 1;
    this.after(OVER_MS, () => this.backToLobby());
  }

  private backToLobby() {
    this.state.phase = POOL_PHASE.lobby;
    dropOrphanBots(this.state.seats);
    for (const s of this.state.seats) {
      if (s.kind !== POOL_SEAT.waiting) continue;
      const slot = this.freeSlot();
      if (slot < 0) break;
      s.kind = POOL_SEAT.human;
      s.slot = slot;
    }
    for (const s of this.state.seats) s.ready = s.kind === POOL_SEAT.bot;
  }
}
