import { buildCourse, PICKUP_IDS } from './course.ts';
import { type Input, type Phase, type Runner, takenWords, type World } from './world.ts';

/**
 * The race as Float64 values: numbers travel bit-exact (including −0), so a client that unpacks
 * a server snapshot continues exactly as the server would. The course never travels: it is
 * rebuilt from the seed in the header. Events are per-tick output and don't travel either.
 */
const PHASES = ['countdown', 'run', 'over'] as const satisfies readonly Phase[];
const HEADER = 8;
const PER_RUNNER = 31;

const perRunner = (w: World) => PER_RUNNER + takenWords(w.course);
export const packedLength = (w: World) => HEADER + w.runners.length * perRunner(w);

const bit = (b: boolean) => (b ? 1 : 0);
const inputOut = (i: Input) => [i.h, bit(i.jump), bit(i.duck)];

export function packWorld(w: World, out = new Float64Array(packedLength(w))) {
  out.set(
    [w.seed, w.tick, PHASES.indexOf(w.phase), w.phaseTicks, w.grace, w.finishers, w.rng, w.finishM],
    0,
  );
  const stride = perRunner(w);
  w.runners.forEach((r, i) => {
    const at = HEADER + i * stride;
    out.set(
      [
        r.s,
        r.lane,
        r.y,
        r.vy,
        bit(r.grounded),
        r.platform,
        bit(r.ducking),
        r.coins,
        r.hitSlow,
        r.invulnerable,
        r.jumpBuffer,
        r.coyote,
        r.power ? PICKUP_IDS.indexOf(r.power) : -1,
        r.powerTicks,
        r.finished,
        bit(r.out),
        ...inputOut(r.input),
        ...inputOut(r.prev),
        r.bot,
        r.brain.next,
        r.brain.lane,
        r.brain.jumpAt,
        r.brain.duckUntil,
        r.brain.slop,
        r.brain.seen,
        r.brain.blind,
        r.cursor,
      ],
      at,
    );
    out.set(r.taken, at + PER_RUNNER);
  });
  return out;
}

const dir = (v: number) => (v < 0 ? -1 : v > 0 ? 1 : 0) as -1 | 0 | 1;

/**
 * Overwrites `w` in place (its runner count must match the packed one). A snapshot for another
 * seed swaps the course in first. Returns false if the snapshot doesn't fit.
 */
export function unpackWorld(w: World, a: Float64Array): boolean {
  const at = (i: number) => a[i] ?? 0;
  const seed = at(0) >>> 0;
  const course = seed === w.seed ? w.course : buildCourse(seed);
  const stride = PER_RUNNER + takenWords(course);
  const count = (a.length - HEADER) / stride;
  if (!Number.isInteger(count) || count !== w.runners.length) return false;
  if (course !== w.course) {
    w.seed = seed;
    w.course = course;
    for (const r of w.runners) r.taken = new Uint32Array(takenWords(course));
  }
  w.tick = at(1);
  w.phase = PHASES[at(2)] ?? 'run';
  w.phaseTicks = at(3);
  w.grace = at(4);
  w.finishers = at(5);
  w.rng = at(6) >>> 0;
  w.finishM = at(7);
  w.events.length = 0;
  w.runners.forEach((r: Runner, i) => {
    const b = HEADER + i * stride;
    const f = (k: number) => at(b + k);
    r.s = f(0);
    r.lane = f(1);
    r.y = f(2);
    r.vy = f(3);
    r.grounded = f(4) === 1;
    r.platform = f(5);
    r.ducking = f(6) === 1;
    r.coins = f(7);
    r.hitSlow = f(8);
    r.invulnerable = f(9);
    r.jumpBuffer = f(10);
    r.coyote = f(11);
    r.power = PICKUP_IDS[f(12)] ?? null;
    r.powerTicks = f(13);
    r.finished = f(14);
    r.out = f(15) === 1;
    r.input = { h: dir(f(16)), jump: f(17) === 1, duck: f(18) === 1 };
    r.prev = { h: dir(f(19)), jump: f(20) === 1, duck: f(21) === 1 };
    r.bot = f(22);
    r.brain = {
      next: f(23),
      lane: f(24),
      jumpAt: f(25),
      duckUntil: f(26),
      slop: f(27),
      seen: f(28),
      blind: f(29),
    };
    r.cursor = f(30);
    for (let k = 0; k < r.taken.length; k++) r.taken[k] = at(b + PER_RUNNER + k) >>> 0;
  });
  return true;
}
