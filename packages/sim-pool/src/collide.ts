import {
  BALL_INERTIA,
  BALL_MASS_KG,
  BALL_RADIUS_M,
  BALL_RESTITUTION,
  CUSHION_COS,
  CUSHION_FRICTION,
  CUSHION_RESTITUTION,
  CUSHION_SIN,
  THROW_FRICTION,
} from './constants.ts';
import { expDet } from './math.ts';
import { type Balls, F, STRIDE } from './state.ts';
import type { Point, Segment } from './table.ts';

const R = BALL_RADIUS_M;
const TWO_R_SQ = 4 * R * R;
const R_SQ = R * R;

// ── Time of impact (straight-line motion over one sub-step; friction moves a ball < 5 µm in 2 ms) ──

/** Earliest t in [0, max] when balls i and j touch while closing, else −1. */
export function ballBallToi(b: Balls, i: number, j: number, max: number): number {
  const oi = i * STRIDE;
  const oj = j * STRIDE;
  const dx = (b[oj + F.x] ?? 0) - (b[oi + F.x] ?? 0);
  const dy = (b[oj + F.y] ?? 0) - (b[oi + F.y] ?? 0);
  const wx = (b[oj + F.vx] ?? 0) - (b[oi + F.vx] ?? 0);
  const wy = (b[oj + F.vy] ?? 0) - (b[oi + F.vy] ?? 0);
  const closing = dx * wx + dy * wy;
  if (closing >= 0) return -1;
  const c = dx * dx + dy * dy - TWO_R_SQ;
  if (c <= 0) return 0;
  const a = wx * wx + wy * wy;
  const disc = closing * closing - a * c;
  if (disc < 0) return -1;
  const t = (-closing - Math.sqrt(disc)) / a;
  return t <= max ? t : -1;
}

/** Ball i against a cushion face (between its end points), else −1. */
export function segmentToi(b: Balls, i: number, s: Segment, max: number): number {
  const o = i * STRIDE;
  const px = b[o + F.x] ?? 0;
  const py = b[o + F.y] ?? 0;
  const vx = b[o + F.vx] ?? 0;
  const vy = b[o + F.vy] ?? 0;
  const vn = vx * s.nx + vy * s.ny;
  if (vn >= 0) return -1;
  const d0 = (px - s.ax) * s.nx + (py - s.ay) * s.ny;
  // Behind the face (in a pocket mouth past it) never collides with it.
  if (d0 < 0) return -1;
  const t = d0 <= R ? 0 : (R - d0) / vn;
  if (t > max) return -1;
  // The contact must land between the end points; the ends themselves are knuckles.
  const cx = px + vx * t;
  const cy = py + vy * t;
  const ex = s.bx - s.ax;
  const ey = s.by - s.ay;
  const along = (cx - s.ax) * ex + (cy - s.ay) * ey;
  return along >= 0 && along <= ex * ex + ey * ey ? t : -1;
}

/** Ball i against a knuckle (a cushion end point, a sharp jaw corner), else −1. */
export function pointToi(b: Balls, i: number, p: Point, max: number): number {
  const o = i * STRIDE;
  const dx = p.x - (b[o + F.x] ?? 0);
  const dy = p.y - (b[o + F.y] ?? 0);
  const vx = b[o + F.vx] ?? 0;
  const vy = b[o + F.vy] ?? 0;
  const closing = -(dx * vx + dy * vy);
  if (closing >= 0) return -1;
  const c = dx * dx + dy * dy - R_SQ;
  if (c <= 0) return 0;
  const a = vx * vx + vy * vy;
  const disc = closing * closing - a * c;
  if (disc < 0) return -1;
  const t = (-closing - Math.sqrt(disc)) / a;
  return t <= max ? t : -1;
}

// ── Resolution ──

/**
 * Ball–ball impact (pooltool `frictional_inelastic`, from Alciatore TP A-5/A-6/A-14): restitution
 * along the line of centres, then a friction impulse on the contact slip that produces throw and
 * spin transfer, capped where the slip would reverse. Returns the closing speed (for audio).
 */
export function resolveBallBall(b: Balls, i: number, j: number): number {
  const oi = i * STRIDE;
  const oj = j * STRIDE;
  let nx = (b[oj + F.x] ?? 0) - (b[oi + F.x] ?? 0);
  let ny = (b[oj + F.y] ?? 0) - (b[oi + F.y] ?? 0);
  const d = Math.sqrt(nx * nx + ny * ny);
  nx /= d;
  ny /= d;
  // Frame: n (line of centres), t = ẑ × n = (−ny, nx), z up.
  const tx = -ny;
  const ty = nx;
  const v1n = (b[oi + F.vx] ?? 0) * nx + (b[oi + F.vy] ?? 0) * ny;
  const v1t = (b[oi + F.vx] ?? 0) * tx + (b[oi + F.vy] ?? 0) * ty;
  const v2n = (b[oj + F.vx] ?? 0) * nx + (b[oj + F.vy] ?? 0) * ny;
  const v2t = (b[oj + F.vx] ?? 0) * tx + (b[oj + F.vy] ?? 0) * ty;
  const w1n = (b[oi + F.wx] ?? 0) * nx + (b[oi + F.wy] ?? 0) * ny;
  const w1t = (b[oi + F.wx] ?? 0) * tx + (b[oi + F.wy] ?? 0) * ty;
  const w1z = b[oi + F.wz] ?? 0;
  const w2n = (b[oj + F.wx] ?? 0) * nx + (b[oj + F.wy] ?? 0) * ny;
  const w2t = (b[oj + F.wx] ?? 0) * tx + (b[oj + F.wy] ?? 0) * ty;
  const w2z = b[oj + F.wz] ?? 0;

  const e = BALL_RESTITUTION;
  const v1nF = 0.5 * ((1 - e) * v1n + (1 + e) * v2n);
  const v2nF = 0.5 * ((1 + e) * v1n + (1 - e) * v2n);
  const dvn = v2nF - v1nF < 0 ? v1nF - v2nF : v2nF - v1nF;

  // Contact slip (tangential components only): (v1 − v2) + R·(ω1 + ω2) × n̂, in (t, z).
  // With n̂ = x̂ of the frame: (ω × n̂) = (0, ωz, −ωt) in (n, t, z).
  const st = v1t - v2t + R * (w1z + w2z);
  const sz = -R * (w1t + w2t);
  const slip = Math.sqrt(st * st + sz * sz);

  let dv1t = 0;
  let dv1z = 0;
  if (slip > 0) {
    const mu = THROW_FRICTION.a + THROW_FRICTION.b * expDet(-THROW_FRICTION.c * slip);
    // Friction closes slip at 7/2 per unit Δv; stop at zero slip rather than reversing it.
    const full = mu * dvn;
    const stick = slip / 7;
    const mag = full < stick ? full : stick;
    dv1t = (-mag * st) / slip;
    dv1z = (-mag * sz) / slip;
  }
  // Δω1 = (5/2R)·(n̂ × Δv1), same for ball 2 (both contact impulses give equal angular impulse).
  // n̂ × (0, a, b) in (n, t, z) = (0, −b, a).
  const k = 5 / (2 * R);
  const dwt = k * -dv1z;
  const dwz = k * dv1t;

  const v1tF = v1t + dv1t;
  const v2tF = v2t - dv1t;
  const w1tF = w1t + dwt;
  const w2tF = w2t + dwt;

  b[oi + F.vx] = v1nF * nx + v1tF * tx;
  b[oi + F.vy] = v1nF * ny + v1tF * ty;
  b[oj + F.vx] = v2nF * nx + v2tF * tx;
  b[oj + F.vy] = v2nF * ny + v2tF * ty;
  b[oi + F.wx] = w1n * nx + w1tF * tx;
  b[oi + F.wy] = w1n * ny + w1tF * ty;
  b[oi + F.wz] = w1z + dwz;
  b[oj + F.wx] = w2n * nx + w2tF * tx;
  b[oj + F.wy] = w2n * ny + w2tF * ty;
  b[oj + F.wz] = w2z + dwz;
  return v1n - v2n;
}

/**
 * Ball against a cushion with outward unit normal (nx, ny) pointing *into* the cushion
 * (Han 2005, via pooltool `han_2005`): the cushion nose sits above the ball's equator, so the
 * impulse has a vertical part that trades spin for speed. Returns the impact speed.
 */
export function resolveCushion(b: Balls, i: number, nx: number, ny: number): number {
  const o = i * STRIDE;
  // Cushion frame: x into the cushion, y = ẑ × x.
  const yx = -ny;
  const yy = nx;
  const vx0 = b[o + F.vx] ?? 0;
  const vy0 = b[o + F.vy] ?? 0;
  const wx0 = b[o + F.wx] ?? 0;
  const wy0 = b[o + F.wy] ?? 0;
  const vX = vx0 * nx + vy0 * ny;
  const vY = vx0 * yx + vy0 * yy;
  let wX = wx0 * nx + wy0 * ny;
  let wY = wx0 * yx + wy0 * yy;
  let wZ = b[o + F.wz] ?? 0;
  if (vX <= 0) return 0;

  const sin = CUSHION_SIN;
  const cos = CUSHION_COS;
  const m = BALL_MASS_KG;
  // Han eqs 14: slip at the contact point, and the approach speed along the contact normal.
  const sx = vX * sin + R * wY;
  const sy = -vY - R * wZ * cos + R * wX * sin;
  const c = -vX * cos;
  // Eqs 16-20
  const A = 7 / 2 / m;
  const B = 1 / m;
  const PzE = (-(1 + CUSHION_RESTITUTION) * c) / B;
  const s0 = Math.sqrt(sx * sx + sy * sy);
  let PxE: number;
  let PyE: number;
  if (s0 / A <= CUSHION_FRICTION * PzE || s0 === 0) {
    PxE = sx / A;
    PyE = sy / A;
  } else {
    PxE = (CUSHION_FRICTION * PzE * sx) / s0;
    PyE = (CUSHION_FRICTION * PzE * sy) / s0;
  }
  // Eqs 21-23
  const PX = -PxE * sin - PzE * cos;
  const PY = PyE;
  const PZ = PxE * cos - PzE * sin;
  const vXF = vX + PX / m;
  const vYF = vY + PY / m;
  const I = BALL_INERTIA;
  wX += (-R / I) * PY * sin;
  wY += (R / I) * (PX * sin - PZ * cos);
  wZ += (R / I) * PY * cos;

  b[o + F.vx] = vXF * nx + vYF * yx;
  b[o + F.vy] = vXF * ny + vYF * yy;
  b[o + F.wx] = wX * nx + wY * yx;
  b[o + F.wy] = wX * ny + wY * yy;
  b[o + F.wz] = wZ;
  return vX;
}

/** Knuckle hit: a cushion impact whose normal runs from the ball centre to the point. */
export function resolveKnuckle(b: Balls, i: number, p: Point): number {
  const o = i * STRIDE;
  const dx = p.x - (b[o + F.x] ?? 0);
  const dy = p.y - (b[o + F.y] ?? 0);
  const d = Math.sqrt(dx * dx + dy * dy);
  return resolveCushion(b, i, dx / d, dy / d);
}

export type Contact = {
  i: number;
  j: number;
  nx: number;
  ny: number;
  closing: number;
  impulse: number;
};

/**
 * Simultaneous impact of a touching cluster (sequential impulses, projected Gauss–Seidel): every
 * contact ends up separating at e × its closing speed where the pack allows, with non-negative
 * impulses. Pairwise friction then runs per contact with the solved normal impulse.
 */
export function resolveCluster(b: Balls, contacts: Contact[], iterations: number): number {
  let loudest = 0;
  for (const c of contacts) {
    const oi = c.i * STRIDE;
    const oj = c.j * STRIDE;
    const rel =
      ((b[oi + F.vx] ?? 0) - (b[oj + F.vx] ?? 0)) * c.nx +
      ((b[oi + F.vy] ?? 0) - (b[oj + F.vy] ?? 0)) * c.ny;
    c.closing = rel > 0 ? rel : 0;
    c.impulse = 0;
    if (rel > loudest) loudest = rel;
  }
  for (let it = 0; it < iterations; it++) {
    for (const c of contacts) {
      const oi = c.i * STRIDE;
      const oj = c.j * STRIDE;
      // Separation speed along n (from i to j); target e × the original closing speed.
      const sep =
        ((b[oj + F.vx] ?? 0) - (b[oi + F.vx] ?? 0)) * c.nx +
        ((b[oj + F.vy] ?? 0) - (b[oi + F.vy] ?? 0)) * c.ny;
      // Δv per unit (impulse/m) along n is 2 for equal masses.
      let next = c.impulse + (BALL_RESTITUTION * c.closing - sep) / 2;
      if (next < 0) next = 0;
      const d = next - c.impulse;
      c.impulse = next;
      if (d === 0) continue;
      b[oi + F.vx] = (b[oi + F.vx] ?? 0) - d * c.nx;
      b[oi + F.vy] = (b[oi + F.vy] ?? 0) - d * c.ny;
      b[oj + F.vx] = (b[oj + F.vx] ?? 0) + d * c.nx;
      b[oj + F.vy] = (b[oj + F.vy] ?? 0) + d * c.ny;
    }
  }
  return loudest;
}
