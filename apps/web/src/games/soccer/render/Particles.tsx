import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type InstancedMesh, Object3D } from 'three/webgpu';

import type { ParticlePool } from '@arena/fx';

import type { SoccerFx } from './fx.ts';

const dummy = new Object3D();
const tint = new Color();
/** Confetti tumbles: each piece spins at its own rate (derived from its slot, no randomness). */
const TUMBLE_RAD_PER_S = 9;

function draw(mesh: InstancedMesh, pool: ParticlePool, t: number, tumble: boolean) {
  let n = 0;
  for (let i = 0; i < pool.capacity; i++) {
    if ((pool.life[i] ?? 0) <= 0) continue;
    const fade = pool.fade(i);
    const s = (pool.size[i] ?? 0) * (tumble ? 1 : 0.4 + fade * 0.8);
    dummy.position.set(pool.x[i] ?? 0, pool.y[i] ?? 0, 0.25 + (i % 7) * 0.01);
    if (tumble) {
      const spin = t * TUMBLE_RAD_PER_S * (0.5 + (i % 5) / 5) + i;
      dummy.rotation.set(spin, spin * 0.7, spin * 0.3);
      dummy.scale.set(s, s * 1.6 * Math.max(0.2, fade), s);
    } else {
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(s);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    mesh.setColorAt(n, tint.setHex(pool.color[i] ?? 0xffffff));
    n += 1;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/** Kick puffs and goal confetti, one instanced draw each. */
export function Particles({ fx }: { fx: SoccerFx }) {
  const puffs = useRef<InstancedMesh>(null);
  const confetti = useRef<InstancedMesh>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    fx.update(Math.min(delta, 0.05));
    if (puffs.current) draw(puffs.current, fx.puffs, t.current, false);
    if (confetti.current) draw(confetti.current, fx.confetti, t.current, true);
  });
  return (
    <>
      <instancedMesh
        ref={puffs}
        args={[undefined, undefined, fx.puffs.capacity]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
      <instancedMesh
        ref={confetti}
        args={[undefined, undefined, fx.confetti.capacity]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial side={2} />
      </instancedMesh>
    </>
  );
}
