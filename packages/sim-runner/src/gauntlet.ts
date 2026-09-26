import { TICK_HZ } from './constants.ts';
import { BARRIER_IDS, BARRIERS, baseSpeedAt, type Entity } from './course.ts';
import { tick } from './tick.ts';
import { newWorld, type SimEvent, takenWords, type World } from './world.ts';

/**
 * "Call the Wipeout" (the Runner's wager): a lone bot runs a short all-barrier gauntlet with no
 * coins, so its first hit ends the run: DAG Dasher's original rule. The round is called on what
 * stops it: the colour (verb) of the barrier it fails, or a clean run to the line.
 */
export const GAUNTLET = {
  /** The run starts partway up the speed ramp, so the gauntlet is fast from the first step. */
  startM: 1200,
  lengthM: 520,
  /** The first barrier sits this far out; none in the last stretch before the line. */
  leadM: 45,
  clearM: 25,
  /** One barrier every this long at the stretch's base speed (the race's 1.1 s, a touch busier). */
  everyS: 0.9,
  countdownS: 1,
  /**
   * A nervy mid-skill runner. With this gauntlet it ends jump 27% · duck 28% · move 12% ·
   * strict 10% · clean 23% (6000 runs), close to the declared 5 · 6 · 3 · 2 · 4 twentieths.
   */
  skill: 55,
} as const;

/** How a gauntlet ends, in the declared table's order (casino-math `WIPEOUT_CLASSES`). */
export const WIPEOUTS = ['jump', 'duck', 'move', 'strict', 'clean'] as const;
export type Wipeout = (typeof WIPEOUTS)[number];

function stream(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barriers only, from the same templates and lane rotations as the race. */
export function buildGauntlet(seed: number, g = GAUNTLET): Entity[] {
  const rand = stream(seed ^ 0x6a09e667);
  const out: Entity[] = [];
  const end = g.startM + g.lengthM - g.clearM;
  for (let s = g.startM + g.leadM; s < end; s += baseSpeedAt(s) * g.everyS) {
    const barrier = BARRIER_IDS[Math.floor(rand() * BARRIER_IDS.length)] ?? 'jumpSingle';
    let lanes: number = BARRIERS[barrier].lanes;
    if (lanes !== 0b111) {
      const turn = rand();
      if (turn < 0.33) lanes = ((lanes << 1) | (lanes >> 2)) & 0b111;
      else if (turn < 0.66) lanes = ((lanes >> 1) | (lanes << 2)) & 0b111;
    }
    out.push({ kind: 'barrier', s, barrier, lanes });
  }
  return out;
}

/** A bank seed's gauntlet, ready to run (it plays out with `tick`). */
export function gauntletWorld(seed: number, g = GAUNTLET): World {
  const w = newWorld(seed, [g.skill]);
  w.course = buildGauntlet(seed, g);
  w.finishM = g.startM + g.lengthM;
  w.phaseTicks = g.countdownS * TICK_HZ;
  const r = w.runners[0];
  if (r) {
    r.s = g.startM;
    r.coins = 0;
    r.taken = new Uint32Array(takenWords(w.course));
  }
  return w;
}

/** Names the ending as it happens (the miner, the CI bank test and the live presentation). */
export function wipeoutOf(w: World, events: readonly SimEvent[]): Wipeout | null {
  for (const e of events) {
    if (e.kind === 'finish') return 'clean';
    if (e.kind === 'wipeout') {
      const b = w.course[e.entity];
      return b?.kind === 'barrier' ? BARRIERS[b.barrier].verb : null;
    }
  }
  return null;
}

/** No gauntlet lasts longer than this (it is ~13 s); a runaway would be a sim bug. */
const MAX_GAUNTLET_TICKS = 90 * TICK_HZ;

/** Runs a bank seed's gauntlet to its ending (index into `WIPEOUTS`). */
export function runWipeout(seed: number): number {
  const w = gauntletWorld(seed);
  while (w.tick < MAX_GAUNTLET_TICKS) {
    tick(w);
    const ending = wipeoutOf(w, w.events);
    if (ending) return WIPEOUTS.indexOf(ending);
  }
  throw new Error(`gauntlet ${seed} never ended`);
}
