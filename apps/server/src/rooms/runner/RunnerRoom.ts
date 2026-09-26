import { type Client, Room, ServerError } from 'colyseus';

import {
  RUNNER_INPUT_BYTES,
  RUNNER_MIN_TO_START,
  RUNNER_MSG,
  RUNNER_PHASE,
  RUNNER_SEAT,
  RUNNER_SEATS,
  RUNNER_SNAPSHOT_HEADER_BYTES,
  RUNNER_WATCHER,
  type RunnerJoinOptions,
  type RunnerRaceEnd,
  type RunnerRaceStart,
  RunnerRoomState,
  RunnerSeat,
} from '@arena/protocol/runner';
import { PROTOCOL_VERSION } from '@arena/shared';
import { newWorld, packedLength, packWorld, standings, tick, type World } from '@arena/sim-runner';

import { PROTOCOL_MISMATCH, releaseCode, uniqueCode } from '../codes.ts';
import {
  BOT_NAMES,
  BOT_SKILL,
  MAX_CLIENTS,
  MAX_NAME_LENGTH,
  OVER_MS,
  RECONNECT_SECONDS,
  SNAPSHOT_EVERY_TICKS,
  TICK_MS,
} from './config.ts';

type Seat = InstanceType<typeof RunnerSeat>;
type Input = { seq: number; h: -1 | 0 | 1; jump: boolean; duck: boolean };

/**
 * Server-authoritative ghost race: the same deterministic TS sim as the browser at 60 Hz, one
 * course from one seed. Humans send held inputs every tick; every client gets the whole race at
 * 20 Hz with its own input ack, so it predicts its own runner exactly and replays unacknowledged
 * inputs. Bots are real sim bots in labelled seats; runners who drop mid-race hand their body to
 * one. Watchers are welcome any time.
 */
export class RunnerRoom extends Room<{ state: InstanceType<typeof RunnerRoomState> }> {
  override maxClients = MAX_CLIENTS;
  override state = new RunnerRoomState();
  private world: World | null = null;
  private packed = new Float64Array(0);
  private latestInputs = new Map<number, Input>();
  private ticks = 0;
  private seed = 1;
  private current: RunnerRaceStart | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];

  override async onCreate(options: RunnerJoinOptions) {
    this.roomId = await uniqueCode(this.presence);
    this.state.code = this.roomId;
    this.state.protocolVersion = PROTOCOL_VERSION;
    if (options.private) await this.setPrivate(true);
    this.seed = Math.floor(Math.random() * 0xffffffff) >>> 0 || 1;

    this.onMessageBytes(RUNNER_MSG.input, (client, bytes: Uint8Array) =>
      this.onInput(client, bytes),
    );
    this.onMessage(RUNNER_MSG.ready, (client, ready: boolean) => {
      const seat = this.seatOf(client);
      if (seat && this.state.phase === RUNNER_PHASE.lobby) seat.ready = Boolean(ready);
    });
    this.onMessage(RUNNER_MSG.addBot, (client) => this.hostOnly(client, () => this.addBot()));
    this.onMessage(RUNNER_MSG.removeBot, (client) => this.hostOnly(client, () => this.removeBot()));
    this.onMessage(RUNNER_MSG.start, (client) => this.hostOnly(client, () => this.startRace()));
    this.setSimulationInterval(() => this.step(), TICK_MS);
  }

  override onAuth(_client: Client, options: RunnerJoinOptions) {
    if (options.protocolVersion !== PROTOCOL_VERSION)
      throw new ServerError(PROTOCOL_MISMATCH, 'Client protocol is out of date: reload the page.');
    return true;
  }

  override onJoin(client: Client, options: RunnerJoinOptions) {
    const inPlay = this.state.phase !== RUNNER_PHASE.lobby;
    const slot = inPlay ? -1 : this.freeSlot();
    const seat = new RunnerSeat();
    seat.slot = slot < 0 ? RUNNER_WATCHER : slot;
    seat.kind = seat.slot === RUNNER_WATCHER ? RUNNER_SEAT.waiting : RUNNER_SEAT.human;
    seat.sessionId = client.sessionId;
    seat.name = (options.name || 'Guest').slice(0, MAX_NAME_LENGTH);
    this.state.seats.push(seat);
    if (!this.state.hostSessionId) this.state.hostSessionId = client.sessionId;
    if (this.clients.length >= MAX_CLIENTS) void this.lock();
    // Mid-race: watch it live from the next snapshot.
    if (inPlay && this.current) client.send(RUNNER_MSG.raceStart, this.current);
  }

  override async onDrop(client: Client) {
    const seat = this.seatOf(client);
    if (seat) seat.connected = false;
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      this.release(client);
    }
  }

  override onReconnect(client: Client) {
    const seat = this.seatOf(client);
    if (seat) seat.connected = true;
    if (this.state.phase !== RUNNER_PHASE.lobby && this.current)
      client.send(RUNNER_MSG.raceStart, this.current);
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
    for (let slot = 0; slot < RUNNER_SEATS; slot++)
      if (!this.state.seats.some((s) => s.slot === slot)) return slot;
    return -1;
  }

  private hostOnly(client: Client, run: () => void) {
    if (client.sessionId === this.state.hostSessionId && this.state.phase === RUNNER_PHASE.lobby)
      run();
  }

  private botName() {
    const taken = new Set(this.state.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !taken.has(`Bot · ${n}`)) ?? BOT_NAMES[0];
    return `Bot · ${name}`;
  }

  private addBot(slot = this.freeSlot()) {
    if (slot < 0) return;
    const seat = new RunnerSeat();
    seat.slot = slot;
    seat.kind = RUNNER_SEAT.bot;
    seat.name = this.botName();
    seat.ready = true;
    this.state.seats.push(seat);
  }

  private removeBot() {
    for (let i = this.state.seats.length - 1; i >= 0; i--) {
      if (this.state.seats[i]?.kind === RUNNER_SEAT.bot) {
        this.state.seats.splice(i, 1);
        return;
      }
    }
  }

  /** Leaving mid-race hands the runner to a labelled bot; in the lobby the seat simply frees up. */
  private release(client: Client) {
    const seat = this.seatOf(client);
    if (!seat) return;
    if (this.state.phase === RUNNER_PHASE.lobby || seat.kind === RUNNER_SEAT.waiting) {
      this.state.seats.splice(this.state.seats.indexOf(seat), 1);
    } else {
      seat.kind = RUNNER_SEAT.bot;
      seat.sessionId = '';
      seat.connected = true;
      seat.name = `Bot (${seat.name})`;
      const r = this.world?.runners[seat.slot];
      if (r) r.bot = BOT_SKILL;
    }
    if (this.state.hostSessionId === client.sessionId)
      this.state.hostSessionId =
        this.state.seats.find((s) => s.kind === RUNNER_SEAT.human)?.sessionId ?? '';
    if (this.clients.length < MAX_CLIENTS) void this.unlock();
  }

  // ── race flow ────────────────────────────────────────────────────────

  private after(ms: number, run: () => void) {
    this.timers.push(setTimeout(run, ms));
  }

  /**
   * Everyone seated races (two or more, humans and labelled bots). Seats are renumbered to sim
   * slots in lobby order, so each runner keeps the colour the lobby showed.
   */
  private startRace() {
    const playing = () => this.state.seats.filter((s) => s.kind !== RUNNER_SEAT.waiting);
    if (playing().length < RUNNER_MIN_TO_START) return;
    const seats = [...playing()].sort((a, b) => a.slot - b.slot);
    seats.forEach((s, i) => {
      s.slot = i;
    });
    this.seed = Math.imul(this.seed ^ (this.state.races + 1), 2654435761) >>> 0 || 1;
    const bots = seats.map((s) => (s.kind === RUNNER_SEAT.bot ? BOT_SKILL : -1));
    this.world = newWorld(this.seed, bots);
    this.packed = new Float64Array(packedLength(this.world));
    this.latestInputs.clear();
    this.current = { seed: this.seed, bots, names: seats.map((s) => s.name) };
    this.state.phase = RUNNER_PHASE.playing;
    this.broadcast(RUNNER_MSG.raceStart, this.current);
    this.sendSnapshots();
  }

  private raceOver(w: World) {
    const order = standings(w);
    const winner = this.state.seats.find(
      (s) => s.kind !== RUNNER_SEAT.waiting && s.slot === order[0],
    );
    if (winner) winner.wins += 1;
    this.state.phase = RUNNER_PHASE.over;
    this.state.races += 1;
    this.broadcast(RUNNER_MSG.raceEnd, { order } satisfies RunnerRaceEnd);
    this.after(OVER_MS, () => this.backToLobby());
  }

  private backToLobby() {
    this.world = null;
    this.current = null;
    this.state.phase = RUNNER_PHASE.lobby;
    // Watchers take the free seats for the next race.
    for (const s of this.state.seats) {
      if (s.kind !== RUNNER_SEAT.waiting) continue;
      const slot = this.freeSlot();
      if (slot < 0) break;
      s.kind = RUNNER_SEAT.human;
      s.slot = slot;
    }
    for (const s of this.state.seats) s.ready = s.kind === RUNNER_SEAT.bot;
  }

  // ── sim ───────────────────────────────────────────────────────────────

  private onInput(client: Client, bytes: Uint8Array) {
    const seat = this.seatOf(client);
    if (!seat || seat.kind !== RUNNER_SEAT.human || bytes.byteLength < RUNNER_INPUT_BYTES) return;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const seq = dv.getUint32(0, true);
    const prev = this.latestInputs.get(seat.slot);
    if (prev && seq <= prev.seq) return;
    const h = dv.getInt8(4);
    this.latestInputs.set(seat.slot, {
      seq,
      h: h < 0 ? -1 : h > 0 ? 1 : 0,
      jump: dv.getUint8(5) === 1,
      duck: dv.getUint8(6) === 1,
    });
  }

  private step() {
    const w = this.world;
    if (!w || this.state.phase !== RUNNER_PHASE.playing) return;
    for (const seat of this.state.seats) {
      if (seat.kind !== RUNNER_SEAT.human) continue;
      const r = w.runners[seat.slot];
      const input = seat.connected ? this.latestInputs.get(seat.slot) : undefined;
      if (r) r.input = { h: input?.h ?? 0, jump: input?.jump ?? false, duck: input?.duck ?? false };
    }
    tick(w);
    this.ticks += 1;
    if (this.ticks % SNAPSHOT_EVERY_TICKS === 0) this.sendSnapshots();
    if (w.phase === 'over') {
      this.sendSnapshots();
      this.raceOver(w);
    }
  }

  /** Same world bytes to everyone; each packet carries that client's own input ack. */
  private sendSnapshots() {
    const w = this.world;
    if (!w) return;
    packWorld(w, this.packed);
    const packet = new Uint8Array(RUNNER_SNAPSHOT_HEADER_BYTES + this.packed.byteLength);
    packet.set(new Uint8Array(this.packed.buffer), RUNNER_SNAPSHOT_HEADER_BYTES);
    const dv = new DataView(packet.buffer);
    for (const client of this.clients) {
      const seat = this.seatOf(client);
      const ack =
        seat && seat.kind === RUNNER_SEAT.human ? (this.latestInputs.get(seat.slot)?.seq ?? 0) : 0;
      dv.setUint32(0, ack, true);
      client.sendBytes(RUNNER_MSG.snapshot, packet);
    }
  }
}
