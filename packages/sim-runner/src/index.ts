export { thinkBot } from './bot.ts';
export * from './constants.ts';
export * from './course.ts';
export * from './serialize.ts';
export { coastSpeed, momentum, runnerHeight, speedOf, step } from './step.ts';
export * from './world.ts';

import { thinkBot } from './bot.ts';
import { step } from './step.ts';
import type { Runner, World } from './world.ts';

/** Bots decide, then the world steps: the one call a race loop needs per tick. */
export function tick(w: World) {
  w.runners.forEach((r, i) => {
    if (r.bot >= 0) r.input = thinkBot(w, i);
  });
  step(w);
}

/**
 * Finishers by the tick they crossed; everyone else by distance, then coins. Wiped-out runners
 * rank on how far they got, like everyone still out on the road.
 */
export function standings(w: World): number[] {
  const order = w.runners.map((_, i) => i);
  const key = (r: Runner) => (r.finished >= 0 ? r.finished : Number.POSITIVE_INFINITY);
  return order.sort((a, b) => {
    const ra = w.runners[a] as Runner;
    const rb = w.runners[b] as Runner;
    return key(ra) - key(rb) || rb.s - ra.s || rb.coins - ra.coins || a - b;
  });
}

/** A cheap, order-stable fingerprint of the race (for determinism checks and rooms). */
export function hashWorld(w: World): string {
  const nums: number[] = [w.seed, w.tick, w.phaseTicks, w.grace, w.finishers, w.rng];
  for (const r of w.runners) {
    nums.push(r.s, r.lane, r.y, r.vy, r.coins, r.hitSlow, r.invulnerable, r.powerTicks, r.finished);
    nums.push(...r.taken);
  }
  const bytes = new Uint8Array(new Float64Array(nums).buffer);
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16);
}
