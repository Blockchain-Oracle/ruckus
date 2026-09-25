import { ARENA } from '../map.ts';
import type { BirdPose } from './Bird.tsx';

/**
 * Attract-mode choreography until the wasm sim drives real bot matches: each hero patrols a ledge,
 * pauses at the ends and hops now and then. Pure function of time, so it never drifts.
 */
const BODY_W = 24;
const BODY_H = 32;
const RUN_PX_PER_S = 150;
const PAUSE_S = 0.9;
const HOP_EVERY_S = 2.6;
const HOP_S = 0.62;
const HOP_PX = 70;
const LEDGES = [1, 2, 3, 0] as const;
const GROUND_SPAN = { x: 360, w: 240 };

export function attractPose(slot: number) {
  const platform = ARENA.platforms[LEDGES[slot % LEDGES.length] ?? 0] ?? ARENA.platforms[0];
  const span = slot === 3 ? GROUND_SPAN : { x: platform.x, w: platform.w };
  const left = span.x + 8;
  const right = span.x + span.w - BODY_W - 8;
  const legS = (right - left) / RUN_PX_PER_S;
  const cycleS = 2 * (legS + PAUSE_S);
  const phaseOffset = slot * 1.37;

  return (timeS: number, out: BirdPose) => {
    const t = (timeS + phaseOffset) % cycleS;
    let x: number;
    let moving = true;
    if (t < legS) {
      x = left + t * RUN_PX_PER_S;
      out.facing = 1;
    } else if (t < legS + PAUSE_S) {
      x = right;
      moving = false;
      out.facing = 1;
    } else if (t < 2 * legS + PAUSE_S) {
      x = right - (t - legS - PAUSE_S) * RUN_PX_PER_S;
      out.facing = -1;
    } else {
      x = left;
      moving = false;
      out.facing = -1;
    }
    const hopT = (timeS + phaseOffset * 2) % HOP_EVERY_S;
    const hopping = moving && hopT < HOP_S;
    const k = hopT / HOP_S;
    const lift = hopping ? 4 * HOP_PX * k * (1 - k) : 0;
    out.x = x;
    out.y = platform.y - BODY_H - lift;
    out.anim = hopping ? (k < 0.5 ? 'jump' : 'fall') : moving ? 'run' : 'idle';
  };
}
