import {
  BALL_RADIUS_M,
  REST_SPEED_M_S,
  ROLL_DECEL,
  SLIDE_DECEL,
  SLIP_CLOSE_RATE,
  SPIN_DECEL,
} from './constants.ts';
import { type Balls, F, STRIDE } from './state.ts';

const R = BALL_RADIUS_M;
/** Contact slip below this (m/s) counts as rolling. */
const ROLL_SLIP_M_S = 1e-9;
/** Sliding spin gain: dω/dt = (5·μs·g / 2R)·(ẑ × û). */
const SLIDE_SPIN_ACCEL = (5 * SLIDE_DECEL) / (2 * R);

export const isMoving = (b: Balls, i: number) => {
  const o = i * STRIDE;
  return (
    (b[o + F.vx] ?? 0) !== 0 ||
    (b[o + F.vy] ?? 0) !== 0 ||
    (b[o + F.wx] ?? 0) !== 0 ||
    (b[o + F.wy] ?? 0) !== 0 ||
    (b[o + F.wz] ?? 0) !== 0
  );
};

/**
 * Advance one ball's free motion by `t` seconds under Han 2005 friction. Within each phase the
 * forces are constant, so the update is exact kinematics, split where the ball starts rolling
 * or comes to rest.
 */
export function advanceBall(b: Balls, i: number, t: number) {
  const o = i * STRIDE;
  let x = b[o + F.x] ?? 0;
  let y = b[o + F.y] ?? 0;
  let vx = b[o + F.vx] ?? 0;
  let vy = b[o + F.vy] ?? 0;
  let wx = b[o + F.wx] ?? 0;
  let wy = b[o + F.wy] ?? 0;
  let wz = b[o + F.wz] ?? 0;
  let left = t;

  // Side spin decays on its own at a constant rate.
  if (wz !== 0) {
    const drop = SPIN_DECEL * t;
    wz = wz > 0 ? (wz > drop ? wz - drop : 0) : wz < -drop ? wz + drop : 0;
  }

  while (left > 0) {
    // Contact-point slip u = v + R·(ẑ × ω) = (vx − R·wy, vy + R·wx).
    const ux = vx - R * wy;
    const uy = vy + R * wx;
    const slip = Math.sqrt(ux * ux + uy * uy);
    if (slip > ROLL_SLIP_M_S) {
      // Sliding: friction opposes slip; slip shrinks along its own direction at (7/2)·μs·g.
      const dt = Math.min(left, slip / SLIP_CLOSE_RATE);
      const hx = ux / slip;
      const hy = uy / slip;
      const ax = -SLIDE_DECEL * hx;
      const ay = -SLIDE_DECEL * hy;
      x += vx * dt + 0.5 * ax * dt * dt;
      y += vy * dt + 0.5 * ay * dt * dt;
      vx += ax * dt;
      vy += ay * dt;
      // ẑ × û = (−hy, hx)
      wx += -SLIDE_SPIN_ACCEL * hy * dt;
      wy += SLIDE_SPIN_ACCEL * hx * dt;
      left -= dt;
      if (left > 0 || dt === slip / SLIP_CLOSE_RATE) {
        // Slip is gone: lock spin to the roll so rounding can't leave a sliver of slide.
        wx = -vy / R;
        wy = vx / R;
      }
      continue;
    }
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed <= REST_SPEED_M_S) {
      vx = 0;
      vy = 0;
      wx = 0;
      wy = 0;
      break;
    }
    // Rolling: constant deceleration along −v̂, spin follows the roll.
    const dt = Math.min(left, speed / ROLL_DECEL);
    const hx = vx / speed;
    const hy = vy / speed;
    x += vx * dt - 0.5 * ROLL_DECEL * hx * dt * dt;
    y += vy * dt - 0.5 * ROLL_DECEL * hy * dt * dt;
    const next = speed - ROLL_DECEL * dt;
    if (next <= REST_SPEED_M_S) {
      vx = 0;
      vy = 0;
    } else {
      vx = hx * next;
      vy = hy * next;
    }
    wx = -vy / R;
    wy = vx / R;
    left -= dt;
    if (vx === 0 && vy === 0) break;
  }

  b[o + F.x] = x;
  b[o + F.y] = y;
  b[o + F.vx] = vx;
  b[o + F.vy] = vy;
  b[o + F.wx] = wx;
  b[o + F.wy] = wy;
  b[o + F.wz] = wz;
}
