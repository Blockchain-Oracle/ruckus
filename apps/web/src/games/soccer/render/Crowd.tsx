import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, type InstancedMesh, Object3D } from 'three/webgpu';

import { COLORS, DEPTH, KITS } from '../config.ts';
import type { SoccerFx } from './fx.ts';
import { dressingRandom } from './textures.ts';

/** Tiers of seating climbing away from the pitch. */
export const TIERS = {
  rows: 9,
  rowDepth: 0.72,
  rowRise: 0.5,
  halfSpan: 15,
  seatGap: 0.34,
  baseY: 1.1,
} as const;
const FAN_SIZE = 0.22;
/** Idle sway, and how high a fan jumps at full excitement. */
const IDLE_BOB = 0.025;
const JUMP_H = 0.28;
const JUMP_HZ = 2.2;
/** Share of fans wearing a kit (the rest are neutral colours); left end backs team 0. */
const KIT_SHARE = 0.55;
const NEUTRALS = ['#e8dcc6', '#3d3552', '#5c4a7a', '#b9a58a', '#2a2438', '#8a7fa6'] as const;

type Fan = { x: number; y: number; z: number; phase: number; team: 0 | 1 | -1; tall: number };

/**
 * The home crowd: one instanced draw of little egg-fans in the stands. They sway on their own and
 * jump when the fx says the stadium is excited (the scoring team's end hardest).
 */
export function Crowd({ fx }: { fx: SoccerFx }) {
  const mesh = useRef<InstancedMesh>(null);
  const fans = useMemo(() => {
    const rnd = dressingRandom(0xfa45);
    const out: Fan[] = [];
    for (let row = 0; row < TIERS.rows; row++) {
      const z = DEPTH.standsFront - row * TIERS.rowDepth - TIERS.rowDepth * 0.5;
      const y = TIERS.baseY + row * TIERS.rowRise + FAN_SIZE;
      for (let x = -TIERS.halfSpan; x <= TIERS.halfSpan; x += TIERS.seatGap) {
        // Empty seats here and there so it reads as people, not wallpaper.
        if (rnd() < 0.12) continue;
        const kit = rnd() < KIT_SHARE;
        out.push({
          x: x + (rnd() - 0.5) * 0.12,
          y,
          z: z + (rnd() - 0.5) * 0.1,
          phase: rnd() * Math.PI * 2,
          team: kit ? (x < 0 ? 0 : 1) : -1,
          tall: 0.85 + rnd() * 0.3,
        });
      }
    }
    return out;
  }, []);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    const rnd = dressingRandom(0xc010);
    fans.forEach((f, i) => {
      const hex =
        f.team >= 0
          ? KITS[f.team as 0 | 1][rnd() < 0.5 ? 'body' : 'partner']
          : (NEUTRALS[Math.floor(rnd() * NEUTRALS.length)] ?? COLORS.stand);
      m.setColorAt(i, c.set(hex));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [fans]);

  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    const m = mesh.current;
    if (!m) return;
    const ex = fx.excitement;
    fans.forEach((f, i) => {
      const cheering = f.team >= 0 && f.team === fx.celebrating ? 1 : 0.45;
      const jump =
        Math.max(0, Math.sin(t.current * JUMP_HZ * Math.PI * 2 + f.phase)) * JUMP_H * ex * cheering;
      const bob = Math.sin(t.current * 1.3 + f.phase) * IDLE_BOB;
      dummy.position.set(f.x, f.y + jump + bob, f.z);
      dummy.scale.set(FAN_SIZE, FAN_SIZE * f.tall, FAN_SIZE);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, fans.length]} frustumCulled={false}>
      <capsuleGeometry args={[0.5, 0.7, 3, 8]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}
