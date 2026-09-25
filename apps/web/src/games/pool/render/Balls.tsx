import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { type Mesh, Quaternion, Vector3 } from 'three/webgpu';

import { BALL_COUNT, BALL_RADIUS_M, F, ON_TABLE, POCKETS, STRIDE } from '@arena/sim-pool';

import { CORNER_POCKET_OUT, SIDE_POCKET_OUT, SURFACE_Y, worldZ } from '../config.ts';
import type { PoolDriver } from '../match/driver.ts';
import { ballTexture } from './ballTextures.ts';

const R = BALL_RADIUS_M;
/** A potted ball drops and slides into the cup over this long, then hides. */
const DROP_S = 0.35;
const DROP_DEPTH = 0.09;

const axis = new Vector3();
const dq = new Quaternion();

type Drop = { t: number; fromX: number; fromZ: number; pocket: number };

/**
 * The 16 balls, drawn from the driver's state every frame. Orientation is integrated from the sim's
 * real angular velocity, so draw, follow and side spin are visible on the numbers and the dot.
 */
export function Balls({ driver }: { driver: () => PoolDriver }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const state = useMemo(
    () =>
      Array.from({ length: BALL_COUNT }, (_, i) => ({
        q: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), (i * 2.39996) % (Math.PI * 2)),
        wasOn: true,
        drop: null as Drop | null,
      })),
    [],
  );
  const lastDriver = useRef<PoolDriver | null>(null);

  useFrame((_, delta) => {
    const d = driver();
    const b = d.balls;
    // A new rack: everyone back on the table, no stale drop animations.
    if (lastDriver.current !== d) {
      lastDriver.current = d;
      for (const s of state) {
        s.wasOn = true;
        s.drop = null;
      }
    }
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < BALL_COUNT; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const s = state[i];
      if (!s) continue;
      const o = i * STRIDE;
      const on = (b[o + F.pocket] ?? 0) === ON_TABLE;
      const x = b[o + F.x] ?? 0;
      const z = worldZ(b[o + F.y] ?? 0);
      if (s.wasOn && !on) s.drop = { t: 0, fromX: x, fromZ: z, pocket: b[o + F.pocket] ?? 0 };
      if (on) s.drop = null;
      s.wasOn = on;

      // Roll: rotate by ω·dt about ω, mapped like positions: (x, y, up) → (x, up, −y).
      const wx = b[o + F.wx] ?? 0;
      const wy = b[o + F.wy] ?? 0;
      const wz = b[o + F.wz] ?? 0;
      axis.set(wx, wz, -wy);
      const w = axis.length();
      if (w > 0 && on) {
        dq.setFromAxisAngle(axis.divideScalar(w), w * dt);
        s.q.premultiply(dq);
      }
      m.quaternion.copy(s.q);

      if (on) {
        m.visible = true;
        m.position.set(x, SURFACE_Y + R, z);
      } else if (s.drop) {
        const p = POCKETS[s.drop.pocket] ?? { x, y: -z };
        const out = s.drop.pocket < 4 ? CORNER_POCKET_OUT : SIDE_POCKET_OUT;
        const px = p.x + Math.sign(p.x) * (s.drop.pocket < 4 ? out : 0);
        const pz = worldZ(p.y + Math.sign(p.y) * out);
        s.drop.t += dt;
        const k = Math.min(1, s.drop.t / DROP_S);
        m.visible = k < 1;
        m.position.set(
          s.drop.fromX + (px - s.drop.fromX) * k,
          SURFACE_Y + R - DROP_DEPTH * k * k,
          s.drop.fromZ + (pz - s.drop.fromZ) * k,
        );
      } else {
        m.visible = false;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: BALL_COUNT }, (_, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: ball number is the identity
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[R, 48, 32]} />
          <meshPhysicalMaterial
            map={ballTexture(i)}
            roughness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.05}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}
