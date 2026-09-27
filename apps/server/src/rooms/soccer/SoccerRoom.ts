import { type Client, Room, ServerError } from 'colyseus';

import {
  SOCCER_BOT_LEVELS,
  SOCCER_INPUT_BYTES,
  SOCCER_MSG,
  SOCCER_PER_TEAM,
  SOCCER_PHASE,
  SOCCER_SEAT,
  SOCCER_SEATS,
  SOCCER_SNAPSHOT_HEADER_BYTES,
  SOCCER_WATCHER,
  type SoccerBotLevel,
  type SoccerJoinOptions,
  type SoccerMatchEnd,
  type SoccerMatchStart,
  SoccerRoomState,
  SoccerSeat,
} from '@arena/protocol/soccer';
import { PROTOCOL_VERSION } from '@arena/shared';
import {
  newWorld,
  packedLength,
  packWorld,
  type Team,
  tick,
  validLayout,
  type World,
} from '@arena/sim-soccer';

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
  BOT_DIFFICULTY,
  BOT_NAMES,
  MAX_CLIENTS,
  MAX_NAME_LENGTH,
  OVER_MS,
  SNAPSHOT_EVERY_TICKS,
  TICK_MS,
} from './config.ts';

type Seat = InstanceType<typeof SoccerSeat>;
type Input = { seq: number; h: -1 | 0 | 1; jump: boolean };

/**
 * Server-authoritative head soccer: the same deterministic TS sim as the browser at 60 Hz. Humans
 * send inputs every tick; every client gets the whole world at 20 Hz with its own input ack, so it
 * can predict the match and replay its unacknowledged inputs. Bots are real sim bots in labelled
 * seats; players who drop mid-match hand their egg to one. Watchers are welcome any time.
 */
export class SoccerRoom extends Room<{ state: InstanceType<typeof SoccerRoomState> }> {
  override maxClients = MAX_CLIENTS;
  override state = new SoccerRoomState();
  private world: World | null = null;
  private packed = new Float64Array(0);
  private latestInputs = new Map<number, Input>();
  private ticks = 0;
  private seed = 1;
  private current: SoccerMatchStart | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  override async onCreate(options: SoccerJoinOptions) {
    this.roomId = await uniqueCode(this.presence);
    this.state.code = this.roomId;
    this.state.protocolVersion = PROTOCOL_VERSION;
    if (options.private) await this.setPrivate(true);
    this.seed = Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;

    this.onMessageBytes(SOCCER_MSG.input, (client, bytes: Uint8Array) =>
      this.onInput(client, bytes),
    );
    this.onMessage(SOCCER_MSG.ready, (client, ready: boolean) => {
      const seat = this.seatOf(client);
      if (seat && this.state.phase === SOCCER_PHASE.lobby) seat.ready = Boolean(ready);
    });
    this.onMessage(SOCCER_MSG.setTeam, (client, msg: { team?: unknown }) => {
      const seat = this.seatOf(client);
      const team = asTeam(msg?.team);
      if (!seat || team === null || this.state.phase !== SOCCER_PHASE.lobby) return;
      if (
        seat.kind !== SOCCER_SEAT.human ||
        seat.team === team ||
        this.teamSize(team) >= SOCCER_PER_TEAM
      )
        return;
      seat.team = team;
    });
    this.onMessage(SOCCER_MSG.addBot, (client, msg: { team?: unknown; level?: unknown }) =>
      this.hostOnly(client, () => {
        const team = asTeam(msg?.team);
        if (team !== null) this.addBot(team, asLevel(msg?.level));
      }),
    );
    this.onMessage(SOCCER_MSG.removeBot, (client, msg: { slot?: unknown }) =>
      this.hostOnly(client, () => this.removeBot(Number(msg?.slot))),
    );
    this.onMessage(SOCCER_MSG.setBotLevel, (client, msg: { slot?: unknown; level?: unknown }) =>
      this.hostOnly(client, () => {
        const bot = this.state.seats.find(
          (s) => s.kind === SOCCER_SEAT.bot && !s.takeoverOf && s.slot === Number(msg?.slot),
        );
        if (bot) bot.botLevel = asLevel(msg?.level);
      }),
    );
    this.onMessage(SOCCER_MSG.start, (client) => this.hostOnly(client, () => this.startMatch()));
    this.setSimulationInterval(() => this.step(), TICK_MS);
  }

  override onAuth(_client: Client, options: SoccerJoinOptions) {
    if (options.protocolVersion !== PROTOCOL_VERSION)
      throw new ServerError(PROTOCOL_MISMATCH, 'Client protocol is out of date: reload the page.');
    return true;
  }

  override onJoin(client: Client, options: SoccerJoinOptions) {
    const inPlay = this.state.phase !== SOCCER_PHASE.lobby;
    const name = (options.name || 'Guest').slice(0, MAX_NAME_LENGTH);
    const playerId = validPlayerId(options.playerId);
    // A reload, new tab or late return takes the player's own seat back (ADR-009).
    const back = returningSeat(this.state.seats, playerId);
    if (back) {
      const wasHost = back.sessionId !== '' && back.sessionId === this.state.hostSessionId;
      reclaim(back, client.sessionId, name);
      const p = this.world?.players[back.slot];
      if (p) p.bot = -1;
      if (wasHost || !this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    } else {
      const team = inPlay ? null : this.openTeam();
      const slot = team === null ? -1 : this.freeSlot();
      const seat = new SoccerSeat();
      seat.slot = slot < 0 ? SOCCER_WATCHER : slot;
      seat.kind = seat.slot === SOCCER_WATCHER ? SOCCER_SEAT.waiting : SOCCER_SEAT.human;
      seat.team = seat.kind === SOCCER_SEAT.human && team !== null ? team : -1;
      seat.sessionId = client.sessionId;
      seat.name = name;
      seat.playerId = playerId;
      this.state.seats.push(seat);
      if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    }
    if (this.clients.length >= MAX_CLIENTS) void this.lock();
    // Mid-match: play on (a reclaimed seat) or watch live from the next snapshot.
    this.sendStart(client);
  }

  /**
   * Hold the seat while the phone comes back (not awaited: when the grace runs out, Colyseus calls
   * onLeave itself, which releases the seat exactly once).
   */
  override onDrop(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    seat.connected = false;
    const grace = this.state.phase === SOCCER_PHASE.lobby ? GRACE_LOBBY_S : GRACE_MATCH_S;
    this.allowReconnection(client, grace).catch(() => {});
    // A dropped host keeps the role for a moment; then the lobby shouldn't wait on them.
    if (this.state.hostSessionId === client.sessionId)
      this.after(HOST_HANDOVER_MS, () => {
        if (this.state.hostSessionId === client.sessionId && !this.seatOf(client)?.connected)
          this.state.hostSessionId = nextHost(this.state.seats) || this.state.hostSessionId;
      });
  }

  override onReconnect(client: Client) {
    const seat = this.seatOf(client);
    if (seat) seat.connected = true;
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    this.sendStart(client);
  }

  /** Mid-match, a client (re)joining gets the match with its own slot (−1 watching). */
  private sendStart(client: Client) {
    if (this.state.phase === SOCCER_PHASE.lobby || !this.current) return;
    const seat = this.seatOf(client);
    const you = seat && seat.kind === SOCCER_SEAT.human ? seat.slot : -1;
    client.send(SOCCER_MSG.matchStart, { ...this.current, you } satisfies SoccerMatchStart);
  }

  override onLeave(client: Client) {
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

  private freeSlot(): number {
    for (let slot = 0; slot < SOCCER_SEATS; slot++)
      if (!this.state.seats.some((s) => s.slot === slot)) return slot;
    return -1;
  }

  private hostOnly(client: Client, run: () => void) {
    if (client.sessionId === this.state.hostSessionId && this.state.phase === SOCCER_PHASE.lobby)
      run();
  }

  private botName() {
    const taken = new Set(this.state.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !taken.has(`Bot · ${n}`)) ?? BOT_NAMES[0];
    return `Bot · ${name}`;
  }

  /** Players on a side (humans and bots; not watchers). */
  private teamSize(team: Team) {
    return this.state.seats.filter((s) => s.kind !== SOCCER_SEAT.waiting && s.team === team).length;
  }

  /** The side a newcomer joins: the smaller one with room (Tomato on a tie), or none. */
  private openTeam(): Team | null {
    const [a, b] = [this.teamSize(0), this.teamSize(1)];
    if (a >= SOCCER_PER_TEAM && b >= SOCCER_PER_TEAM) return null;
    if (a >= SOCCER_PER_TEAM) return 1;
    if (b >= SOCCER_PER_TEAM) return 0;
    return b < a ? 1 : 0;
  }

  /** Host only: a labelled bot on the side they chose, at the level they chose. */
  private addBot(team: Team, level: SoccerBotLevel) {
    const slot = this.freeSlot();
    if (slot < 0 || this.teamSize(team) >= SOCCER_PER_TEAM) return;
    const seat = new SoccerSeat();
    seat.slot = slot;
    seat.kind = SOCCER_SEAT.bot;
    seat.name = this.botName();
    seat.team = team;
    seat.botLevel = level;
    seat.ready = true;
    this.state.seats.push(seat);
  }

  private removeBot(slot: number) {
    const i = this.state.seats.findIndex((s) => s.kind === SOCCER_SEAT.bot && s.slot === slot);
    if (i >= 0) this.state.seats.splice(i, 1);
  }

  /**
   * Called once per departure (a consented leave, or a drop whose grace ran out). Mid-match a
   * labelled bot keeps the egg warm until its player returns; in the lobby the seat frees up.
   */
  private release(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    if (this.state.phase === SOCCER_PHASE.lobby || seat.kind === SOCCER_SEAT.waiting) {
      this.state.seats.splice(this.state.seats.indexOf(seat), 1);
    } else {
      takeOver(seat);
      const p = this.world?.players[seat.slot];
      if (p) p.bot = BOT_DIFFICULTY;
    }
    if (this.state.hostSessionId === client.sessionId)
      this.state.hostSessionId = nextHost(this.state.seats, client.sessionId);
    if (this.clients.length < MAX_CLIENTS) void this.unlock();
  }

  // ── match flow ────────────────────────────────────────────────────────

  private after(ms: number, run: () => void) {
    this.timers.push(setTimeout(run, ms));
  }

  /**
   * The line-up the lobby shows is the line-up that plays: 1v1, 2v1, 2v2, whatever the players
   * picked and the host seated. Nobody is moved and no bot is added behind their backs. Seats are
   * compacted to sim slots; each client learns its own from the start message.
   */
  private startMatch() {
    const seats = this.state.seats
      .filter((s) => s.kind !== SOCCER_SEAT.waiting)
      .sort((a, b) => a.slot - b.slot);
    const teams = seats.map((s) => s.team as Team);
    if (!validLayout(teams)) return;
    seats.forEach((s, i) => {
      s.slot = i;
    });
    this.seed = Math.imul(this.seed ^ (this.state.matches + 1), 2654435761) >>> 0 || 1;
    const bots = seats.map((s) =>
      s.kind === SOCCER_SEAT.bot ? SOCCER_BOT_LEVELS[asLevel(s.botLevel)] : -1,
    );
    this.world = newWorld(this.seed, teams, bots);
    this.packed = new Float64Array(packedLength(seats.length));
    this.latestInputs.clear();
    this.current = { seed: this.seed, teams, bots, names: seats.map((s) => s.name), you: -1 };
    this.state.phase = SOCCER_PHASE.playing;
    // Per client, with its slot: seats were just renumbered and the state patch lags behind.
    for (const client of this.clients) this.sendStart(client);
    this.sendSnapshots();
  }

  private fullTime(w: World) {
    const [a, b] = w.score;
    const winner: -1 | 0 | 1 = a === b ? -1 : a > b ? 0 : 1;
    for (const s of this.state.seats)
      if (s.kind !== SOCCER_SEAT.waiting && winner >= 0 && s.team === winner) s.wins += 1;
    this.state.phase = SOCCER_PHASE.over;
    this.state.matches += 1;
    this.broadcast(SOCCER_MSG.matchEnd, { score: [a, b], winner } satisfies SoccerMatchEnd);
    this.after(OVER_MS, () => this.backToLobby());
  }

  private backToLobby() {
    this.world = null;
    this.current = null;
    this.state.phase = SOCCER_PHASE.lobby;
    dropOrphanBots(this.state.seats);
    // Watchers take the free seats for the next match.
    for (const s of this.state.seats) {
      if (s.kind !== SOCCER_SEAT.waiting) continue;
      const slot = this.freeSlot();
      const team = this.openTeam();
      if (slot < 0 || team === null) break;
      s.kind = SOCCER_SEAT.human;
      s.slot = slot;
      s.team = team;
    }
    for (const s of this.state.seats) s.ready = s.kind === SOCCER_SEAT.bot;
  }

  // ── sim ───────────────────────────────────────────────────────────────

  private onInput(client: Client, bytes: Uint8Array) {
    const seat = this.seatOf(client);
    if (!seat || seat.kind !== SOCCER_SEAT.human || bytes.byteLength < SOCCER_INPUT_BYTES) return;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const seq = dv.getUint32(0, true);
    const prev = this.latestInputs.get(seat.slot);
    if (prev && seq <= prev.seq) return;
    const h = dv.getInt8(4);
    this.latestInputs.set(seat.slot, {
      seq,
      h: h < 0 ? -1 : h > 0 ? 1 : 0,
      jump: dv.getUint8(5) === 1,
    });
  }

  private step() {
    const w = this.world;
    if (!w || this.state.phase !== SOCCER_PHASE.playing) return;
    for (const seat of this.state.seats) {
      if (seat.kind !== SOCCER_SEAT.human) continue;
      const p = w.players[seat.slot];
      const input = seat.connected ? this.latestInputs.get(seat.slot) : undefined;
      if (p) p.input = { h: input?.h ?? 0, jump: input?.jump ?? false };
    }
    tick(w);
    this.ticks += 1;
    if (this.ticks % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
    if (w.phase === 'over') {
      this.sendSnapshots();
      this.fullTime(w);
    }
  }

  /** Same world bytes to everyone; each packet carries that client's own input ack. */
  private sendSnapshots() {
    const w = this.world;
    if (!w) return;
    packWorld(w, this.packed);
    const packet = new Uint8Array(SOCCER_SNAPSHOT_HEADER_BYTES + this.packed.byteLength);
    packet.set(new Uint8Array(this.packed.buffer), SOCCER_SNAPSHOT_HEADER_BYTES);
    const dv = new DataView(packet.buffer);
    for (const client of this.clients) {
      const seat = this.seatOf(client);
      const ack =
        seat && seat.kind === SOCCER_SEAT.human ? (this.latestInputs.get(seat.slot)?.seq ?? 0) : 0;
      dv.setUint32(0, ack, true);
      client.sendBytes(SOCCER_MSG.snapshot, packet);
    }
  }
}

const asTeam = (v: unknown): Team | null => (v === 0 || v === 1 ? v : null);
const asLevel = (v: unknown): SoccerBotLevel =>
  typeof v === 'string' && v in SOCCER_BOT_LEVELS ? (v as SoccerBotLevel) : 'pro';
