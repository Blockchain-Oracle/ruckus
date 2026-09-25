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
  round = 0;
  private accumulator = 0;
  private overFor = 0;
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  get sim(): Sim {
    this.current ??= this.newRound();
    return this.current;
  }

  start() {
    void this.sim;
  }

  stop() {
    this.current?.free();
    this.current = null;
  }

  get mapId(): number {
    return ATTRACT_MAPS[this.round % ATTRACT_MAPS.length] ?? MapId.Arena;
  }

  private newRound(): Sim {
    const sim = new Sim(this.seed, ATTRACT_PLAYERS, this.mapId);
    ATTRACT_DIFFICULTY.forEach((d, slot) => {
      sim.set_bot(slot, d);
    });
    sim.view(this.curr);
    this.prev.set(this.curr);
    return sim;
  }

  update(dtS: number) {
    if (!this.current) return;
    const sim = this.current;
    this.accumulator = Math.min(this.accumulator + dtS, MAX_CATCH_UP_TICKS * TICK_S);
    while (this.accumulator >= TICK_S) {
      this.prev.set(this.curr);
      sim.step();
      sim.view(this.curr);
      this.accumulator -= TICK_S;
    }
    this.alpha = this.accumulator / TICK_S;

    if (this.curr[H.matchOver]) {
      this.overFor += dtS;
      if (this.overFor >= ATTRACT_RESTART_S) {
        this.overFor = 0;
        this.round += 1;
        // Next exhibition: a fresh seed derived from the last (Knuth multiplicative step).
        this.seed = Math.imul(this.seed ^ this.round, 2654435761) >>> 0 || 1;
        sim.free();
        this.current = this.newRound();
        this.onRound?.();
      }
    }
  }

  onRound?: () => void;
}
