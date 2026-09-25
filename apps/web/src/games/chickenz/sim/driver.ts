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
  | { kind: 'tutorial'; seed: number };

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
    return this.mode.kind === 'match' ? this.mode.humanSlot : -1;
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
      }
      this.prev.set(this.curr);
      sim.step();
      sim.view(this.curr);
      this.onStep?.(this.prev, this.curr);
      this.accumulator -= TICK_S;
    }
    this.alpha = this.accumulator / TICK_S;

    if (!this.curr[H.matchOver] || this.mode.kind === 'tutorial') return;
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

  /** Jump a presented fight to its final frame (tap-to-skip). */
  skipToEnd() {
    const sim = this.current;
    if (!sim || this.mode.kind !== 'fight') return;
    for (let i = 0; i < SKIP_LIMIT_TICKS && !sim.match_over(); i++) sim.step();
    sim.view(this.curr);
    this.prev.set(this.curr);
  }
}
