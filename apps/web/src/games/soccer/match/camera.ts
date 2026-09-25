import { MathUtils } from 'three/webgpu';

import { FRAME_HALF_W, FRAME_Y, PLAY_DISTANCE, PLAY_FOV_DEG } from '../config.ts';
import { getDriver } from './runtime.ts';

/** A high ball lifts the frame, but only this share of the way (the floor stays in shot). */
const LIFT_SHARE = 0.5;
/** Ball height (world units) above which the frame starts to lift. */
const LIFT_FROM = 4.4;
const LIFT_MAX = 1.6;
/** The camera sits above the eye line and looks down a touch, so the grass reads as a pitch. */
const CAMERA_RISE = 2.4;
const SMOOTH_RATE = 4;

let lift = 0;
let last = 0;

/**
 * Both goals always fit: pull back on narrow screens until the pitch width does, and lift the frame
 * to follow a high ball instead of losing it off the top.
 */
export function soccerPose(aspect: number) {
  const d = getDriver();
  if (!d) return null;
  // Config and this module import each other, so read its constants at call time only.
  const fovHalfTan = Math.tan(MathUtils.degToRad(PLAY_FOV_DEG / 2));
  const needHalfH = FRAME_HALF_W / aspect;
  const distance = Math.max(PLAY_DISTANCE, needHalfH / fovHalfTan);
  const now = performance.now() / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  const ballY = d.world.ball.y / 100;
  const want = Math.min(LIFT_MAX, Math.max(0, ballY - LIFT_FROM) * LIFT_SHARE);
  lift = MathUtils.damp(lift, want, SMOOTH_RATE, dt);
  const y = FRAME_Y + lift;
  return {
    position: [0, y + CAMERA_RISE, distance] as const,
    target: [0, y, 0] as const,
  };
}
