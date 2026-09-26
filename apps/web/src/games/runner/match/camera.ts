import { MathUtils } from 'three/webgpu';

import { focusView } from './runtime.ts';

/** How much of your lane and height the camera follows (the road stays centred-ish). */
const FOLLOW_X = 0.55;
const FOLLOW_Y = 0.45;
/** At speed the camera drops back and lower a touch: the road rushes at you. */
const SPEED_PULL_M = 1.6;
const SPEED_FULL_MPS = 45;
const SMOOTH_RATE = 6;
/**
 * DAG Dasher's camera (behind and above, looking down the road), tightened for authored bodies.
 * It lives here rather than in config.ts, which imports this module for the rig.
 */
export const CAMERA = { back: 7.2, up: 3.9, lookAhead: 14, lookY: 1.1 } as const;

let x = 0;
let y = 0;
let pull = 0;
let last = 0;

/**
 * Below this aspect the three lanes no longer fit; the camera backs off and rises to keep them
 * (DAG Dasher widened its FOV ×1.2 in portrait; the shell owns the FOV here, so we move instead).
 */
const FIT_ASPECT = 1.25;
const FIT_MAX = 2.1;

/** Rides behind the focus runner: follows its lane glide and jumps, and eases back with speed. */
export function runnerPose(aspect: number) {
  const now = performance.now() / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  x = MathUtils.damp(x, focusView.x * FOLLOW_X, SMOOTH_RATE, dt);
  y = MathUtils.damp(y, focusView.y * FOLLOW_Y, SMOOTH_RATE, dt);
  pull = MathUtils.damp(pull, Math.min(1, focusView.speed / SPEED_FULL_MPS), 2, dt);
  const fit = Math.min(FIT_MAX, Math.max(1, FIT_ASPECT / aspect));
  const sx = focusView.shakeX;
  const sy = focusView.shakeY;
  return {
    position: [
      x + sx,
      CAMERA.up * fit + y + sy - pull * 0.4,
      CAMERA.back * fit + pull * SPEED_PULL_M,
    ] as const,
    target: [x * 0.8, CAMERA.lookY + y * 0.8, -CAMERA.lookAhead] as const,
  };
}
