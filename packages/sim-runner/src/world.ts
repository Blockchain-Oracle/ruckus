import { COUNTDOWN_S, START_COINS, START_LANE, TICK_HZ } from './constants.ts';
import { buildCourse, type Entity, type PickupId } from './course.ts';

/**
 * A runner's controls as held state: `h` steers (a fresh press moves one lane), `jump` jumps on
 * its press, `duck` ducks while held (and slams in the air). Edges are found in the sim, so a
 * snapshot of held state is all the network ever needs.
 */
export type Input = { h: -1 | 0 | 1; jump: boolean; duck: boolean };
export const IDLE: Input = { h: 0, jump: false, duck: false };

export type Runner = {
  s: number;
  lane: number;
  y: number;
  vy: number;
  /** Standing on something (the road or a platform). */
  grounded: boolean;
  /** The course index of the platform underfoot, or −1. */
  platform: number;
  ducking: boolean;
  coins: number;
  /** Ticks left on each timer (0 = off). */
  hitSlow: number;
  invulnerable: number;
  jumpBuffer: number;
  coyote: number;
  power: PickupId | null;
  powerTicks: number;
  /** Tick the runner crossed the line, or −1. */
  finished: number;
  out: boolean;
  input: Input;
  /** Last tick's held input, to find presses. */
  prev: Input;
  /** Bot skill 0–100, or −1 for a human (or remote) seat. */
  bot: number;
  /** A bot's working memory (part of the state, so snapshots and replays carry it). */
  brain: {
    next: number;
    lane: number;
    jumpAt: number;
    duckUntil: number;
    slop: number;
    /** The last barrier it has sized up, and one it failed to notice (−1 = none). */
    seen: number;
    blind: number;
  };
  /** One bit per course entity: taken (coins, pickups) or already hit (barriers). */
  taken: Uint32Array;
  /** First course index still ahead of (or beside) this runner. */
  cursor: number;
};

export type Phase = 'countdown' | 'run' | 'over';

export type SimEvent =
  | { kind: 'go' }
  | { kind: 'lane'; runner: number }
  | { kind: 'jump'; runner: number }
  | { kind: 'land'; runner: number; speed: number }
  | { kind: 'slam'; runner: number }
  | { kind: 'coin'; runner: number; value: number; entity: number }
  | { kind: 'hit'; runner: number; shielded: boolean; entity: number }
  | { kind: 'wipeout'; runner: number }
  | { kind: 'pickup'; runner: number; pickup: PickupId; entity: number }
  | { kind: 'expire'; runner: number; pickup: PickupId }
  | { kind: 'finish'; runner: number; place: number }
  | { kind: 'over' };

export type World = {
  seed: number;
  course: readonly Entity[];
  tick: number;
  phase: Phase;
  /** Countdown ticks left. */
  phaseTicks: number;
  /** Ticks left for the stragglers once someone finishes (−1 until then). */
  grace: number;
  finishers: number;
  runners: Runner[];
  /** The bots' PRNG (mulberry32); the course has its own stream, so bots never change the road. */
  rng: number;
  events: SimEvent[];
};

export function nextRandom(w: World): number {
  w.rng = (w.rng + 0x6d2b79f5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const takenWords = (course: readonly Entity[]) => Math.ceil(course.length / 32);
export const isTaken = (r: Runner, i: number) => ((r.taken[i >>> 5] ?? 0) & (1 << (i & 31))) !== 0;
export function markTaken(r: Runner, i: number) {
  r.taken[i >>> 5] = (r.taken[i >>> 5] ?? 0) | (1 << (i & 31));
}

export function newRunner(course: readonly Entity[], bot: number): Runner {
  return {
    s: 0,
    lane: START_LANE,
    y: 0,
    vy: 0,
    grounded: true,
    platform: -1,
    ducking: false,
    coins: START_COINS,
    hitSlow: 0,
    invulnerable: 0,
    jumpBuffer: 0,
    coyote: 0,
    power: null,
    powerTicks: 0,
    finished: -1,
    out: false,
    input: { ...IDLE },
    prev: { ...IDLE },
    bot,
    brain: { next: 0, lane: START_LANE, jumpAt: -1, duckUntil: -1, slop: 0, seen: -1, blind: -1 },
    taken: new Uint32Array(takenWords(course)),
    cursor: 0,
  };
}

/** A new race on `seed`'s course. `bots[i]` is each seat's skill, or −1 for a human. */
export function newWorld(seed: number, bots: readonly number[]): World {
  const course = buildCourse(seed);
  return {
    seed: seed >>> 0,
    course,
    tick: 0,
    phase: 'countdown',
    phaseTicks: COUNTDOWN_S * TICK_HZ,
    grace: -1,
    finishers: 0,
    runners: bots.map((b) => newRunner(course, b)),
    rng: (seed ^ 0x9e3779b9) >>> 0 || 1,
    events: [],
  };
}
