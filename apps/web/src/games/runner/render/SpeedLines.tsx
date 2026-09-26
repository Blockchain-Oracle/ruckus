import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  AdditiveBlending,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
} from 'three/webgpu';

import type { RunnerDriver } from '../match/driver.ts';
import { focusView } from '../match/runtime.ts';

const LINES = 48;
/** Streaks live in a tube around the road ahead of you and rush past faster than the world. */
const FAR_Z = -46;
/** They vanish before the camera plane, where a streak would balloon into a bar. */
const NEAR_Z = 1.5;
const RUSH = 2.2;
/** They fade in above this speed (m/s) and are full at the top; a speed orb shows them at full. */
const FROM_MPS = 27;
const FULL_MPS = 44;

const dummy = new Object3D();
const hash = (i: number, k: number) => {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

/** Speed streaks: the sense of pace a static camera can't give on its own. */
export function SpeedLines({ driver }: { driver: () => RunnerDriver }) {
  const mesh = useRef<InstancedMesh>(null);
  const z = useRef(
    Float32Array.from({ length: LINES }, (_, i) => FAR_Z + hash(i, 1) * (NEAR_Z - FAR_Z)),
  );
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const d = driver();
    const r = d.world.runners[d.focus];
    const boost = r?.power === 'speed';
    const level = boost
      ? 1
      : Math.min(1, Math.max(0, (focusView.speed - FROM_MPS) / (FULL_MPS - FROM_MPS)));
    (m.material as MeshBasicMaterial).opacity = 0.35 * level;
    m.visible = level > 0.01;
    if (!m.visible) return;
    for (let i = 0; i < LINES; i++) {
      let zi = (z.current[i] ?? 0) + focusView.speed * RUSH * delta;
      if (zi > NEAR_Z) zi = FAR_Z;
      z.current[i] = zi;
      // Around the road but never across your runner: an ellipse clear of the middle.
      const a = hash(i, 2) * Math.PI * 2;
      const rad = 3.2 + hash(i, 3) * 3.5;
      dummy.position.set(focusView.x + Math.cos(a) * rad * 1.3, 1.6 + Math.sin(a) * rad * 0.7, zi);
      dummy.scale.set(0.03, 0.03, 2.5 + hash(i, 4) * 4);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, LINES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#bff6ff"
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
