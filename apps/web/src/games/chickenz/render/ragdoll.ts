import type { Rect } from './terrain.ts';

/**
 * Chickenz's death ragdoll (`GameScene.ts:1854-1965`, `RagdollSystem.ts`), in px and px/tick like
 * the original: pops up, spins toward its motion, bounces on whatever is below, then settles.
 */
const GRAVITY_PX_PER_T2 = 0.5;
const TICKS_PER_S = 60;
const LAUNCH_VX_SCALE = 1.5;
const LAUNCH_VY_SCALE = 1.2;
const LAUNCH_VY_MIN = -2;
const LAUNCH_POP = 3;
const SPIN_MOVING_RAD_S = 6;
const SPIN_STILL_RAD_S = 5;
const SPIN_MOVING_THRESHOLD = 0.5;
const MAX_TILT = Math.PI / 2;
const BOUNCE_VY = -0.45;
const BOUNCE_VX = 0.7;
const WALL_BOUNCE = 0.4;
const SETTLE_BOUNCES = 3;
const SETTLE_VY = 1.5;
const BODY_W = 24;
const BODY_H = 32;

export type Ragdoll = {
  active: boolean;
  settled: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  bounces: number;
};

export const newRagdoll = (): Ragdoll => ({
  active: false,
  settled: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  rotation: 0,
  spin: 0,
  bounces: 0,
});

export function launch(r: Ragdoll, x: number, y: number, vx: number, vy: number, facing: number) {
  r.active = true;
  r.settled = false;
  r.x = x;
  r.y = y;
  r.vx = vx * LAUNCH_VX_SCALE;
  r.vy = Math.min(vy, LAUNCH_VY_MIN) * LAUNCH_VY_SCALE - LAUNCH_POP;
  r.spin =
    Math.abs(vx) > SPIN_MOVING_THRESHOLD
      ? vx > 0
        ? SPIN_MOVING_RAD_S
        : -SPIN_MOVING_RAD_S
      : facing > 0
        ? -SPIN_STILL_RAD_S
        : SPIN_STILL_RAD_S;
  r.rotation = 0;
  r.bounces = 0;
}

export function stepRagdoll(
  r: Ragdoll,
  dt: number,
  platforms: readonly Rect[],
  mapW: number,
  mapH: number,
) {
  if (!r.active) return;
  const prevBottom = r.y + BODY_H;
  r.vy += GRAVITY_PX_PER_T2 * TICKS_PER_S * dt;
  r.x += r.vx * TICKS_PER_S * dt;
  r.y += r.vy * TICKS_PER_S * dt;
  if (Math.abs(r.rotation) < MAX_TILT) {
    r.rotation += r.spin * dt;
    if (Math.abs(r.rotation) >= MAX_TILT) {
      r.rotation = Math.sign(r.rotation) * MAX_TILT;
      r.spin = 0;
    }
  }
  // Land only on surfaces we were above last frame (falling through from beneath is fine).
  let floor = mapH;
  for (const p of platforms) {
    if (r.x + BODY_W > p.x && r.x < p.x + p.w && prevBottom <= p.y + 1 && p.y < floor) floor = p.y;
  }
  if (r.y + BODY_H >= floor && r.vy > 0) {
    r.y = floor - BODY_H;
    r.bounces += 1;
    if (r.bounces >= SETTLE_BOUNCES || Math.abs(r.vy) < SETTLE_VY) {
      r.active = false;
      r.settled = true;
      r.vx = 0;
      r.vy = 0;
      r.spin = 0;
    } else {
      r.vy *= BOUNCE_VY;
      r.vx *= BOUNCE_VX;
    }
  }
  if (r.x < 0) {
    r.x = 0;
    r.vx = Math.abs(r.vx) * WALL_BOUNCE;
  } else if (r.x + BODY_W > mapW) {
    r.x = mapW - BODY_W;
    r.vx = -Math.abs(r.vx) * WALL_BOUNCE;
  }
}
