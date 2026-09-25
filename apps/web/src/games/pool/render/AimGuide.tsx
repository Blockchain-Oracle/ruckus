import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, Mesh } from 'three/webgpu';

import {
  BALL_COUNT,
  BALL_RADIUS_M,
  CUE_BALL,
  F,
  HALF_L,
  HALF_W,
  onTable,
  STRIDE,
} from '@arena/sim-pool';

import { SURFACE_Y, worldZ } from '../config.ts';
import { aim } from '../match/aim.ts';
import type { PoolDriver } from '../match/driver.ts';

const R = BALL_RADIUS_M;
const LIFT = 0.0015;
const LINE_W = 0.0045;
/** Guide lengths after contact: where the object ball goes, where the cue ball glances off. */
const OBJECT_LEN = 0.32;
const TANGENT_LEN = 0.16;

export type AimCast = {
  /** Ghost-ball centre (where the cue ball is at contact), sim coords. */
  gx: number;
  gy: number;
  /** Ball hit (−1: the cue ball reaches a cushion first). */
  target: number;
  /** Object-ball direction and cue-ball tangent (unit, sim coords). */
  ox: number;
  oy: number;
  tx: number;
  ty: number;
};

/**
 * Straight-line cast of the cue ball along the aim: first ball it would touch, else the cushion.
 * Ignores spin and throw (a guide, not a prediction).
 */
export function castAim(b: Float64Array, dx: number, dy: number): AimCast {
  const cx = b[CUE_BALL * STRIDE + F.x] ?? 0;
  const cy = b[CUE_BALL * STRIDE + F.y] ?? 0;
  let best = Number.POSITIVE_INFINITY;
  let target = -1;
  for (let i = 1; i < BALL_COUNT; i++) {
    if (!onTable(b, i)) continue;
    const px = (b[i * STRIDE + F.x] ?? 0) - cx;
    const py = (b[i * STRIDE + F.y] ?? 0) - cy;
    const along = px * dx + py * dy;
    if (along <= 0) continue;
    const perp2 = px * px + py * py - along * along;
    const reach = 4 * R * R - perp2;
    if (reach < 0) continue;
    const t = along - Math.sqrt(reach);
    if (t < best) {
      best = t;
      target = i;
    }
  }
  // Cushion: the ball centre stays R inside the rails.
  const lx =
    dx > 0 ? (HALF_L - R - cx) / dx : dx < 0 ? (-HALF_L + R - cx) / dx : Number.POSITIVE_INFINITY;
  const ly =
    dy > 0 ? (HALF_W - R - cy) / dy : dy < 0 ? (-HALF_W + R - cy) / dy : Number.POSITIVE_INFINITY;
  const wall = Math.min(lx, ly);
  if (wall < best) {
    return { gx: cx + dx * wall, gy: cy + dy * wall, target: -1, ox: 0, oy: 0, tx: 0, ty: 0 };
  }
  const gx = cx + dx * best;
  const gy = cy + dy * best;
  const tb = target * STRIDE;
  let ox = (b[tb + F.x] ?? 0) - gx;
  let oy = (b[tb + F.y] ?? 0) - gy;
  const ol = Math.hypot(ox, oy);
  ox /= ol;
  oy /= ol;
  // A stun cue ball leaves along the tangent line (perpendicular to the object's path).
  const dot = dx * ox + dy * oy;
  let tx = dx - dot * ox;
  let ty = dy - dot * oy;
  const tl = Math.hypot(tx, ty);
  if (tl > 1e-6) {
    tx /= tl;
    ty /= tl;
  }
  return { gx, gy, target, ox, oy, tx: tl > 1e-6 ? tx : 0, ty: tl > 1e-6 ? ty : 0 };
}

/** A flat strip on the cloth from (x0, y0) to (x1, y1) in sim coords. */
function place(m: Mesh | null, x0: number, y0: number, x1: number, y1: number) {
  if (!m) return;
  const len = Math.hypot(x1 - x0, y1 - y0);
  m.visible = len > 1e-4;
  m.position.set((x0 + x1) / 2, SURFACE_Y + LIFT, worldZ((y0 + y1) / 2));
  m.scale.set(len, 1, 1);
  m.rotation.set(-Math.PI / 2, 0, Math.atan2(y1 - y0, x1 - x0));
}

export function AimGuide({ driver, show }: { driver: () => PoolDriver; show: () => boolean }) {
  const root = useRef<Group>(null);
  const path = useRef<Mesh>(null);
  const obj = useRef<Mesh>(null);
  const tan = useRef<Mesh>(null);
  const ghost = useRef<Mesh>(null);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const d = driver();
    g.visible = show() && d.phase === 'aim';
    if (!g.visible) return;
    const b = d.balls;
    const c = castAim(b, aim.dx, aim.dy);
    const cx = b[CUE_BALL * STRIDE + F.x] ?? 0;
    const cy = b[CUE_BALL * STRIDE + F.y] ?? 0;
    place(path.current, cx + aim.dx * R, cy + aim.dy * R, c.gx - aim.dx * R, c.gy - aim.dy * R);
    const gm = ghost.current;
    if (gm) gm.position.set(c.gx, SURFACE_Y + LIFT * 2, worldZ(c.gy));
    if (c.target >= 0) {
      const tb = c.target * STRIDE;
      const ox0 = b[tb + F.x] ?? 0;
      const oy0 = b[tb + F.y] ?? 0;
      place(
        obj.current,
        ox0 + c.ox * R,
        oy0 + c.oy * R,
        ox0 + c.ox * (R + OBJECT_LEN),
        oy0 + c.oy * (R + OBJECT_LEN),
      );
      place(tan.current, c.gx, c.gy, c.gx + c.tx * TANGENT_LEN, c.gy + c.ty * TANGENT_LEN);
    } else {
      if (obj.current) obj.current.visible = false;
      if (tan.current) tan.current.visible = false;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={path}>
        <planeGeometry args={[1, LINE_W]} />
        <meshBasicMaterial
          color="#fff6e6"
          transparent
          opacity={0.75}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={obj}>
        <planeGeometry args={[1, LINE_W]} />
        <meshBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.85}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={tan}>
        <planeGeometry args={[1, LINE_W * 0.8]} />
        <meshBasicMaterial
          color="#9ad9ff"
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ghost} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 0.0022, R, 48]} />
        <meshBasicMaterial
          color="#fff6e6"
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
