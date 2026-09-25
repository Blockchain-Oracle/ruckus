import {
  BALL_MASS_KG,
  BALL_RADIUS_M,
  CUE_BALL,
  CUE_MASS_KG,
  MAX_CUE_SPEED_M_S,
  MAX_TIP_OFFSET,
} from './constants.ts';
import { type Balls, F, STRIDE } from './state.ts';

/**
 * One shot, exactly as the player chose it. This is all lockstep peers, bots and replays exchange.
 * - (dx, dy): aim direction on the table (normalised here, so any length works).
 * - power: 0..1 of the maximum cue speed.
 * - spinX: side offset, −1 left … +1 right english; spinY: −1 draw … +1 follow (both × max offset).
 */
export type Shot = { dx: number; dy: number; power: number; spinX: number; spinY: number };

const R = BALL_RADIUS_M;
/** Cue end mass for squirt (pooltool: ball mass / 30). */
const MASS_RATIO_END = 30;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Instantaneous point strike with a level cue (pooltool `instantaneous_point`, Dr Dave TP A-30).
 * Speed from momentum and energy transfer; spin from the tip offset; squirt deflects the cue ball
 * away from the english side (TP A-31), realised with a sqrt-only rotation.
 */
export function strike(b: Balls, shot: Shot) {
  let dx = shot.dx;
  let dy = shot.dy;
  const l = Math.sqrt(dx * dx + dy * dy);
  if (l === 0) return;
  dx /= l;
  dy /= l;
  // Pooltool's a: +1 is the ball's left edge, so right english is −a.
  let a = -clamp(shot.spinX, -1, 1) * MAX_TIP_OFFSET;
  let bb = clamp(shot.spinY, -1, 1) * MAX_TIP_OFFSET;
  // Keep the contact point on the ball.
  const r2 = a * a + bb * bb;
  if (r2 > MAX_TIP_OFFSET * MAX_TIP_OFFSET) {
    const k = MAX_TIP_OFFSET / Math.sqrt(r2);
    a *= k;
    bb *= k;
  }
  const V0 = clamp(shot.power, 0, 1) * MAX_CUE_SPEED_M_S;
  const denom = 1 + BALL_MASS_KG / CUE_MASS_KG + (5 / 2) * (a * a + bb * bb);
  const v = (2 * V0) / denom;

  // Squirt: tan α = (5/2)·a·√(1−a²) / (1 + m_r + (5/2)(1−a²)); deflect toward −a (away from english).
  const A = 1 - a * a;
  const tan = -((5 / 2) * a * Math.sqrt(A)) / (1 + MASS_RATIO_END + (5 / 2) * A);
  const cos = 1 / Math.sqrt(1 + tan * tan);
  const sin = tan * cos;
  const sx = dx * cos - dy * sin;
  const sy = dx * sin + dy * cos;

  // ω = (5v/2R)·(b·ℓ̂ − a·ẑ), ℓ̂ = ẑ × aim (topspin rolls forward, left english spins clockwise).
  const k = (5 * v) / (2 * R);
  const o = CUE_BALL * STRIDE;
  b[o + F.vx] = v * sx;
  b[o + F.vy] = v * sy;
  b[o + F.wx] = k * bb * -dy;
  b[o + F.wy] = k * bb * dx;
  b[o + F.wz] = -k * a;
}
