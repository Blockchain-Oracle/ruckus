export { thinkBot } from './bot.ts';
export * from './constants.ts';
export * from './golden.ts';
export * from './serialize.ts';
export { step } from './step.ts';
export * from './world.ts';

import { thinkBot } from './bot.ts';
import { step } from './step.ts';
import type { World } from './world.ts';

/** Bots decide, then the world steps: the one call a match loop needs per tick. */
export function tick(w: World) {
  w.players.forEach((p, i) => {
    if (p.bot >= 0) p.input = thinkBot(w, i);
  });
  step(w);
}

/** A cheap, order-stable fingerprint of the world (for determinism checks and rooms). */
export function hashWorld(w: World): string {
  const nums: number[] = [
    w.tick,
    w.clock,
    w.score[0],
    w.score[1],
    w.ball.x,
    w.ball.y,
    w.ball.vx,
    w.ball.vy,
    w.rng,
  ];
  for (const p of w.players) nums.push(p.x, p.y, p.vx, p.vy, p.speed, p.grow, p.shrink, p.frozen);
  const buf = new Float64Array(nums);
  const bytes = new Uint8Array(buf.buffer);
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16);
}
