import { thinkBot } from './bot.ts';
import { step } from './step.ts';
import type { World } from './world.ts';

/** Bots decide, then the world steps: the one call a race loop needs per tick. */
export function tick(w: World) {
  w.runners.forEach((r, i) => {
    if (r.bot >= 0) r.input = thinkBot(w, i);
  });
  step(w);
}
