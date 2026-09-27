import { type Client, Room, ServerError } from 'colyseus';

import {
  CHICKENZ_MSG,
  CHICKENZ_PHASE,
  type ChickenzJoinOptions,
  ChickenzRoomState,
  ChickenzSeat,
  EMOTE_COOLDOWN_MS,
  type EmoteEvent,
  INPUT_BYTES,
  isChickenzEmote,
  type MatchEndEvent,
  NO_SLOT,
  type RoundEndEvent,
  type RoundStartEvent,
  SEAT_KIND,
  SNAPSHOT_HEADER_BYTES,
} from '@arena/protocol/chickenz';
import { PROTOCOL_VERSION } from '@arena/shared';
import { H, Sim, VIEW_LEN } from '@arena/sim-chickenz';

import { PROTOCOL_MISMATCH, ROOM_FULL, releaseCode, uniqueCode } from '../codes.ts';
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
  COUNTDOWN_MS,
  HEROES,
  MAPS,
  MATCH_OVER_MS,
  MAX_NAME_LENGTH,
  MAX_SEATS,
  MIN_PLAYERS_TO_START,
  ROUND_OVER_MS,
  SNAPSHOT_EVERY_TICKS,
  TICK_MS,
  WINS_TO_TAKE,
} from './config.ts';
import { ensureChickenzWasm } from './sim.ts';

type Seat = InstanceType<typeof ChickenzSeat>;
type Input = { seq: number; buttons: number; aimX: number };

/**
 * Server-authoritative Chickenz: the same wasm sim as the browser at 60 Hz. Humans send inputs on
 * change; each client receives its own 20 Hz binary snapshot with the last input seq applied, so
 * it can restore and replay (prediction + reconciliation, like Chickenz's PredictionManager).
 * Bots are real sim bots in labelled seats.
 */
export class ChickenzRoom extends Room<{ state: InstanceType<typeof ChickenzRoomState> }> {
  override maxClients = MAX_SEATS;
  override state = new ChickenzRoomState();
  private sim: Sim | null = null;
  private latestInputs = new Map<number, Input>();
  private view = new Int32Array(VIEW_LEN);
  private ticks = 0;
  private seed = 1;
  private frozen = true;
  private roundEnded = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  /** The round in progress, replayed to anyone who joins mid-match so they can watch it. */
  private currentRound: RoundStartEvent | null = null;
  private lastEmoteAt = new Map<string, number>();

  override async onCreate(options: ChickenzJoinOptions) {
    ensureChickenzWasm();
    this.roomId = await uniqueCode(this.presence);
    this.state.code = this.roomId;
    this.state.protocolVersion = PROTOCOL_VERSION;
    this.state.winsToTake = WINS_TO_TAKE;
    if (options.private) await this.setPrivate(true);
    this.seed = Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;

    this.onMessageBytes(CHICKENZ_MSG.input, (client, bytes: Uint8Array) =>
      this.onInput(client, bytes),
    );
    this.onMessage(CHICKENZ_MSG.ready, (client, ready: boolean) => {
      const seat = this.seatOf(client);
      if (seat && this.state.phase === CHICKENZ_PHASE.lobby) seat.ready = Boolean(ready);
    });
    this.onMessage(CHICKENZ_MSG.hero, (client, hero: string) => {
      const seat = this.seatOf(client);
      if (
        seat &&
        this.state.phase === CHICKENZ_PHASE.lobby &&
        HEROES.includes(hero as never) &&
        !this.heroTaken(hero)
      )
        seat.hero = hero;
    });
    this.onMessage(CHICKENZ_MSG.addBot, (client) => this.hostOnly(client, () => this.addBot()));
    this.onMessage(CHICKENZ_MSG.removeBot, (client) =>
      this.hostOnly(client, () => this.removeBot()),
    );
    this.onMessage(CHICKENZ_MSG.start, (client) => this.hostOnly(client, () => this.startMatch()));
    this.onMessage(CHICKENZ_MSG.emote, (client, emote: unknown) => {
      const seat = this.seatOf(client);
      // Watchers have no bird to speak from; spam past the cooldown is dropped.
      if (!seat || seat.slot === NO_SLOT || !isChickenzEmote(emote)) return;
      const now = Date.now();
      if (now - (this.lastEmoteAt.get(client.sessionId) ?? 0) < EMOTE_COOLDOWN_MS) return;
      this.lastEmoteAt.set(client.sessionId, now);
      this.broadcast(CHICKENZ_MSG.emote, { slot: seat.slot, emote } satisfies EmoteEvent);
    });
    this.setSimulationInterval(() => this.tick(), TICK_MS);
  }

  override onAuth(_client: Client, options: ChickenzJoinOptions) {
    if (options.protocolVersion !== PROTOCOL_VERSION) {
      throw new ServerError(PROTOCOL_MISMATCH, 'Client protocol is out of date: reload the page.');
    }
    // Mid-match joins are allowed: onJoin seats them as watchers until the next lobby.
    return true;
  }

  override onJoin(client: Client, options: ChickenzJoinOptions) {
    const midMatch = this.state.phase !== CHICKENZ_PHASE.lobby;
    const name = (options.name || 'Guest').slice(0, MAX_NAME_LENGTH);
    const playerId = validPlayerId(options.playerId);
    // A reload, new tab or late return takes the player's own bird back (ADR-009).
    const back = returningSeat(this.state.seats, playerId);
    if (back) {
      const wasHost = back.sessionId !== '' && back.sessionId === this.state.hostSessionId;
      reclaim(back, client.sessionId, name);
      this.sim?.clear_bot(back.slot);
      if (wasHost || !this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
      this.sendRound(client);
      return;
    }
    const slot = midMatch ? NO_SLOT : this.freeSlot();
    if (slot < 0) throw new ServerError(ROOM_FULL, 'That room is full.');
    const seat = new ChickenzSeat();
    seat.slot = slot;
    // Joining mid-match: watch this one live, play the next (never turned away at the door).
    seat.kind = midMatch ? SEAT_KIND.waiting : SEAT_KIND.human;
    seat.sessionId = client.sessionId;
    seat.name = name;
    seat.playerId = playerId;
    const wanted =
      options.hero && HEROES.includes(options.hero as never) && !this.heroTaken(options.hero)
        ? options.hero
        : undefined;
    seat.hero = wanted ?? this.freeHero();
    this.state.seats.push(seat);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    void this.lockIfFull();
    // Joining mid-match: watch this round live.
    this.sendRound(client);
  }

  /**
   * Hold the seat while the phone comes back (not awaited: when the grace runs out, Colyseus calls
   * onLeave itself, which releases the seat exactly once).
   */
  override onDrop(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    seat.connected = false;
    const grace = this.state.phase === CHICKENZ_PHASE.lobby ? GRACE_LOBBY_S : GRACE_MATCH_S;
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
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    this.sendRound(client);
  }

  /** Mid-match, a client (re)joining gets the round with its own slot (−1 watching). */
  private sendRound(client: Client) {
    if (this.state.phase === CHICKENZ_PHASE.lobby || !this.currentRound) return;
    const seat = this.seatOf(client);
    const you = seat && seat.kind === SEAT_KIND.human ? seat.slot : -1;
    client.send(CHICKENZ_MSG.roundStart, { ...this.currentRound, you } satisfies RoundStartEvent);
  }

  override onLeave(client: Client) {
    this.lastEmoteAt.delete(client.sessionId);
    this.release(client);
  }

  override async onDispose() {
    for (const t of this.timers) clearTimeout(t);
    this.sim?.free();
    await releaseCode(this.presence, this.roomId);
  }

  // ── seats ─────────────────────────────────────────────────────────────

  private seatOf(client: Client): Seat | undefined {
    return this.state.seats.find((s) => s.sessionId === client.sessionId);
  }

  private freeSlot(): number {
    for (let slot = 0; slot < MAX_SEATS; slot++)
      if (!this.state.seats.some((s) => s.slot === slot)) return slot;
    return -1;
  }

  private heroTaken(hero: string) {
    return this.state.seats.some((s) => s.hero === hero);
  }

  private freeHero(): string {
    return HEROES.find((h) => !this.heroTaken(h)) ?? HEROES[0];
  }

  private hostOnly(client: Client, run: () => void) {
    if (client.sessionId === this.state.hostSessionId && this.state.phase === CHICKENZ_PHASE.lobby)
      run();
  }

  private addBot() {
    const slot = this.freeSlot();
    if (slot < 0) return;
    const seat = new ChickenzSeat();
    seat.slot = slot;
    seat.kind = SEAT_KIND.bot;
    seat.hero = this.freeHero();
    seat.name = 'Bot';
    seat.ready = true;
    this.state.seats.push(seat);
    void this.lockIfFull();
  }

  private removeBot() {
    for (let i = this.state.seats.length - 1; i >= 0; i--) {
      if (this.state.seats[i]?.kind === SEAT_KIND.bot) {
        this.state.seats.splice(i, 1);
        return;
      }
    }
  }

  /** Only a genuinely full room is locked; a match in progress still welcomes watchers. */
  private async lockIfFull() {
    if (this.state.seats.length >= MAX_SEATS) await this.lock();
    else await this.unlock();
  }

  /** A player who leaves mid-match becomes a labelled bot; in the lobby their seat frees up. */
  private release(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    if (this.state.phase === CHICKENZ_PHASE.lobby || seat.kind === SEAT_KIND.waiting) {
      this.state.seats.splice(this.state.seats.indexOf(seat), 1);
      void this.lockIfFull();
    } else {
      takeOver(seat);
      this.sim?.set_bot(seat.slot, BOT_DIFFICULTY);
    }
    if (this.state.hostSessionId === client.sessionId)
      this.state.hostSessionId = nextHost(this.state.seats, client.sessionId);
  }

  // ── match flow ────────────────────────────────────────────────────────

  private after(ms: number, run: () => void) {
    this.timers.push(setTimeout(run, ms));
  }

  private startMatch() {
    // Seats must be contiguous from slot 0 for the sim; renumber in join order.
    const seats = [...this.state.seats]
      .filter((s) => s.kind !== SEAT_KIND.waiting)
      .sort((a, b) => a.slot - b.slot);
    if (seats.length < MIN_PLAYERS_TO_START) return;
    seats.forEach((s, i) => {
      s.slot = i;
      s.wins = 0;
    });
    this.state.round = 0;
    this.nextRound();
  }

  private nextRound() {
    const players = this.state.seats.filter((s) => s.kind !== SEAT_KIND.waiting).length;
    this.seed = Math.imul(this.seed ^ (this.state.round + 1), 2654435761) >>> 0 || 1;
    const mapId = MAPS[this.state.round % MAPS.length] ?? 0;
    this.sim?.free();
    this.sim = new Sim(this.seed, players, mapId);
    for (const seat of this.state.seats)
      if (seat.kind === SEAT_KIND.bot) this.sim.set_bot(seat.slot, BOT_DIFFICULTY);
    this.latestInputs.clear();
    this.frozen = true;
    this.roundEnded = false;
    this.state.phase = CHICKENZ_PHASE.countdown;
    const lineup = [...this.state.seats]
      .filter((s) => s.kind !== SEAT_KIND.waiting)
      .sort((a, b) => a.slot - b.slot);
    // Kept for watchers and returning players (it used to stay null, so they never got a round).
    this.currentRound = {
      round: this.state.round,
      seed: this.seed,
      mapId,
      countdownMs: COUNTDOWN_MS,
      players,
      you: -1,
      heroes: lineup.map((s) => s.hero),
      names: lineup.map((s) => s.name),
      wins: lineup.map((s) => s.wins),
    };
    // Per client, with its slot: seats were just renumbered and the state patch lags behind.
    for (const client of this.clients) this.sendRound(client);
    this.sendSnapshots();
    this.after(COUNTDOWN_MS, () => {
      this.frozen = false;
      this.state.phase = CHICKENZ_PHASE.playing;
    });
  }

  private endRound() {
    this.roundEnded = true;
    const winner = this.view[H.winner] ?? -1;
    const seat = this.state.seats.find((s) => s.slot === winner);
    if (seat) seat.wins += 1;
    const wins = [...this.state.seats]
      .filter((s) => s.kind !== SEAT_KIND.waiting)
      .sort((a, b) => a.slot - b.slot)
      .map((s) => s.wins);
    const roundEnd: RoundEndEvent = { round: this.state.round, winner, wins };
    this.broadcast(CHICKENZ_MSG.roundEnd, roundEnd);
    this.state.phase = CHICKENZ_PHASE.roundOver;
    this.after(ROUND_OVER_MS, () => {
      if (seat && seat.wins >= WINS_TO_TAKE) {
        this.state.phase = CHICKENZ_PHASE.matchOver;
        const matchEnd: MatchEndEvent = { winner, wins };
        this.broadcast(CHICKENZ_MSG.matchEnd, matchEnd);
        this.after(MATCH_OVER_MS, () => this.backToLobby());
        return;
      }
      this.state.round += 1;
      this.nextRound();
    });
  }

  private backToLobby() {
    this.sim?.free();
    this.sim = null;
    this.currentRound = null;
    this.state.phase = CHICKENZ_PHASE.lobby;
    dropOrphanBots(this.state.seats);
    // Watchers take the free seats for the next match.
    for (const s of this.state.seats) {
      if (s.kind !== SEAT_KIND.waiting) continue;
      s.kind = SEAT_KIND.human;
      s.slot = this.freeSlot();
    }
    for (const s of this.state.seats) s.ready = s.kind === SEAT_KIND.bot;
    void this.lockIfFull();
  }

  // ── sim ───────────────────────────────────────────────────────────────

  private onInput(client: Client, bytes: Uint8Array) {
    const seat = this.seatOf(client);
    if (!seat || bytes.byteLength < INPUT_BYTES) return;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const seq = dv.getUint32(0, true);
    const prev = this.latestInputs.get(seat.slot);
    if (prev && seq <= prev.seq) return; // stale or duplicate
    this.latestInputs.set(seat.slot, {
      seq,
      buttons: dv.getUint8(4),
      aimX: Math.max(-1, Math.min(1, dv.getInt8(5))),
    });
  }

  private tick() {
    const sim = this.sim;
    if (!sim) return;
    if (!this.frozen) {
      for (const seat of this.state.seats) {
        if (seat.kind !== SEAT_KIND.human) continue;
        const input = seat.connected ? this.latestInputs.get(seat.slot) : undefined;
        sim.set_input(seat.slot, input?.buttons ?? 0, input?.aimX ?? 0, 0);
      }
      sim.step();
      sim.view(this.view);
      if (sim.match_over() && !this.roundEnded) this.endRound();
    }
    this.ticks += 1;
    if (this.ticks % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
  }

  /** Per-client snapshot: same state bytes, but each carries that client's own input ack. */
  private sendSnapshots() {
    const sim = this.sim;
    if (!sim) return;
    const body = sim.snapshot();
    const packet = new Uint8Array(SNAPSHOT_HEADER_BYTES + body.byteLength);
    const dv = new DataView(packet.buffer);
    dv.setUint32(0, sim.tick() >>> 0, true);
    for (let slot = 0; slot < MAX_SEATS; slot++) {
      const packed = sim.input_of(slot);
      dv.setUint8(8 + slot * 2, packed & 0xff);
      dv.setInt8(9 + slot * 2, (((packed >> 8) & 0xff) << 24) >> 24);
    }
    packet.set(body, SNAPSHOT_HEADER_BYTES);
    for (const client of this.clients) {
      const seat = this.seatOf(client);
      dv.setUint32(4, seat ? (this.latestInputs.get(seat.slot)?.seq ?? 0) : 0, true);
      client.sendBytes(CHICKENZ_MSG.snapshot, packet);
    }
  }
}
