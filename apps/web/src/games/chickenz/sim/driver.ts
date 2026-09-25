import { H, MapId, Sim, TICK_HZ, VIEW_LEN } from '@arena/sim-chickenz';

const TICK_S = 1 / TICK_HZ;
/** Never simulate more than this per frame (a backgrounded tab would otherwise fast-forward). */
const MAX_CATCH_UP_TICKS = 8;
/** Attract: how long the winner celebrates before the next exhibition round. */
const ATTRACT_RESTART_S = 2.5;
const ATTRACT_PLAYERS = 4;
/** A spread of skill so exhibitions have upsets, all clearly labelled bots. */
const ATTRACT_DIFFICULTY = [55, 70, 80, 90] as const;
const ATTRACT_MAPS = [MapId.Arena, MapId.Towers, MapId.Bridges] as const;
/** Skipping a fight fast-forwards at most this many ticks (well past any round clock). */
const SKIP_LIMIT_TICKS = 60 * 60;
/** Unacknowledged inputs kept for replay (~1 s) and the most we re-simulate per snapshot. */
const MAX_PENDING = 60;
const MAX_REPLAY = 30;

export type Mode =
  | { kind: 'exhibition' }
  /** A wager presentation: one bank seed, all bots, stops at match over. */
  | { kind: 'fight'; seed: number; mapId: number; difficulty: number; players: number }
  /** A human round: `humanSlot` reads `readInput`, the rest are bots. */
  | {
      kind: 'match';
      seed: number;
      mapId: number;
      players: number;
      humanSlot: number;
      difficulty: number;
    }
  /** The hands-on tutorial: you in slot 0, a scripted dummy in slot 1, no clock. */
  | { kind: 'tutorial'; seed: number }
  /** A networked round: predicted locally, corrected by server snapshots (no local bots). */
  | { kind: 'online'; seed: number; mapId: number; players: number; humanSlot: number };

type Input = { buttons: number; aimX: number };

/**
 * Owns one wasm Sim and runs it on a fixed 60 Hz clock, keeping the previous and current render
 * views so the renderer can interpolate between ticks (smooth at any display refresh rate).
 */
export class ChickenzDriver {
  /** Null while stopped: wasm memory is freed explicitly, and StrictMode remounts restart it. */
  private current: Sim | null = null;
  prev = new Int32Array(VIEW_LEN);
  curr = new Int32Array(VIEW_LEN);
  /** 0..1 progress from `prev` to `curr` for render interpolation. */
  alpha = 0;
  /** Bumped whenever the sim is replaced (map may change, per-round visuals reset). */
  round = 0;
  /** While frozen (countdowns) the world holds still but keeps rendering. */
  frozen = false;
  private accumulator = 0;
  private mode: Mode = { kind: 'exhibition' };
  private ended = false;
  private overFor = 0;
  private seed: number;

  /** Fires once when a fight or match round reaches match over. */
  onRoundEnd?: () => void;
  onRound?: () => void;
  /** Every simulated tick, with the views either side of it (sound events diff these). */
  onStep?: (prev: Int32Array, curr: Int32Array) => void;
  readInput?: () => Input;
  /** Online: ship this tick's input to the server (every tick, tagged with a sequence number). */
  sendInput?: (seq: number, buttons: number, aimX: number) => void;
  private seq = 0;
  private pending: { seq: number; buttons: number; aimX: number }[] = [];
  private remoteInputs = new Int8Array(8);
  /** Runs before every tick with the live sim and this tick's human input (tutorial scripting). */
  beforeStep: ((sim: Sim, input: Input) => void) | undefined;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  get sim(): Sim {
    this.current ??= this.newRound();
    return this.current;
  }

  get kind() {
    return this.mode.kind;
  }

  get mapId(): number {
    if (this.mode.kind === 'tutorial') return MapId.Tutorial;
    if (this.mode.kind !== 'exhibition') return this.mode.mapId;
    return ATTRACT_MAPS[this.round % ATTRACT_MAPS.length] ?? MapId.Arena;
  }

  get humanSlot(): number {
    if (this.mode.kind === 'tutorial') return 0;
    return this.mode.kind === 'match' || this.mode.kind === 'online' ? this.mode.humanSlot : -1;
  }

  start() {
    void this.sim;
  }

  stop() {
    this.current?.free();
    this.current = null;
  }

  private newRound(): Sim {
    const m = this.mode;
    let sim: Sim;
    if (m.kind === 'tutorial') {
      sim = Sim.new_tutorial(m.seed);
    } else if (m.kind === 'exhibition') {
      sim = new Sim(this.seed, ATTRACT_PLAYERS, this.mapId);
      ATTRACT_DIFFICULTY.forEach((d, slot) => {
        sim.set_bot(slot, d);
      });
    } else if (m.kind === 'online') {
      // No local bots: every non-local bird is driven by the server's snapshots and inputs.
      sim = new Sim(m.seed, m.players, m.mapId);
      this.remoteInputs.fill(0);
    } else {
      sim = new Sim(m.seed, m.players, m.mapId);
      for (let slot = 0; slot < m.players; slot++) {
        if (m.kind === 'match' && slot === m.humanSlot) continue;
        sim.set_bot(slot, m.difficulty);
      }
    }
    this.ended = false;
    this.overFor = 0;
    this.accumulator = 0;
    this.pending = [];
    sim.view(this.curr);
    this.prev.set(this.curr);
    return sim;
  }

  /** Replace the running sim with a new mode (a fresh round), keeping wasm memory tidy. */
  setMode(mode: Mode) {
    this.stop();
    this.mode = mode;
    this.round += 1;
    this.start();
    this.onRound?.();
  }

  exhibit() {
    if (this.mode.kind !== 'exhibition') this.setMode({ kind: 'exhibition' });
  }

  update(dtS: number) {
    const sim = this.current;
    if (!sim) return;
    if (this.frozen) {
      this.alpha = 1;
      return;
    }
    this.accumulator = Math.min(this.accumulator + dtS, MAX_CATCH_UP_TICKS * TICK_S);
    while (this.accumulator >= TICK_S) {
      const human = this.humanSlot;
      if (human >= 0 && this.readInput) {
        const input = this.readInput();
        sim.set_input(human, input.buttons, input.aimX, 0);
        this.beforeStep?.(sim, input);
        if (this.mode.kind === 'online') {
          this.seq += 1;
          this.pending.push({ seq: this.seq, buttons: input.buttons, aimX: input.aimX });
          if (this.pending.length > MAX_PENDING) this.pending.shift();
          this.sendInput?.(this.seq, input.buttons, input.aimX);
          this.applyRemoteInputs(sim, human);
        }
      }
      this.prev.set(this.curr);
      sim.step();
      sim.view(this.curr);
      this.onStep?.(this.prev, this.curr);
      this.accumulator -= TICK_S;
    }
    this.alpha = this.accumulator / TICK_S;

    // Online rounds end on the server's word, never on a local prediction.
    if (!this.curr[H.matchOver] || this.mode.kind === 'tutorial' || this.mode.kind === 'online')
      return;
    if (this.mode.kind !== 'exhibition') {
      if (!this.ended) {
        this.ended = true;
        this.onRoundEnd?.();
      }
      return;
    }
    this.overFor += dtS;
    if (this.overFor >= ATTRACT_RESTART_S) {
      // Next exhibition: a fresh seed derived from the last (Knuth multiplicative step).
      this.seed = Math.imul(this.seed ^ (this.round + 1), 2654435761) >>> 0 || 1;
      this.setMode({ kind: 'exhibition' });
    }
  }

  private applyRemoteInputs(sim: Sim, human: number) {
    for (let slot = 0; slot < 4; slot++) {
      if (slot === human) continue;
      sim.set_input(
        slot,
        this.remoteInputs[slot * 2] ?? 0,
        this.remoteInputs[slot * 2 + 1] ?? 0,
        0,
      );
    }
  }

  /**
   * Server snapshot: restore the authoritative state, drop inputs the server has applied, and
   * re-run the rest so our own bird stays exactly where our fingers put it (Chickenz-style
   * prediction and reconciliation). Remote birds keep their last known input between snapshots.
   */
  applySnapshot(ack: number, remote: Int8Array, body: Uint8Array) {
    const sim = this.current;
    if (!sim || this.mode.kind !== 'online') return;
    if (!sim.restore(body)) return;
    this.remoteInputs.set(remote);
    const human = this.mode.humanSlot;
    this.pending = this.pending.filter((p) => p.seq > ack);
    if (!this.frozen) {
      for (const p of this.pending.slice(-MAX_REPLAY)) {
        sim.set_input(human, p.buttons, p.aimX, 0);
        this.applyRemoteInputs(sim, human);
        sim.step();
      }
    }
    sim.view(this.curr);
  }

  /** Jump a presented fight to its final frame (tap-to-skip). */
  skipToEnd() {
    const sim = this.current;
    if (!sim || this.mode.kind !== 'fight') return;
    for (let i = 0; i < SKIP_LIMIT_TICKS && !sim.match_over(); i++) sim.step();
    sim.view(this.curr);
    this.prev.set(this.curr);
  }
}
