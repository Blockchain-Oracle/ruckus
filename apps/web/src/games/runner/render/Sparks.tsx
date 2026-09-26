import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, Color, type InstancedMesh, Object3D } from 'three/webgpu';

import { zAt } from '../config.ts';
import type { RunnerFx } from './fx.ts';

const dummy = new Object3D();
const tint = new Color();

/** The fx's course-anchored sparks, one additive instanced draw. */
export function Sparks({ fx, focusS }: { fx: RunnerFx; focusS: () => number }) {
  const mesh = useRef<InstancedMesh>(null);
  useFrame((_, delta) => {
    fx.update(Math.min(delta, 0.05));
    const m = mesh.current;
    if (!m) return;
    const p = fx.sparks;
    const s = focusS();
    let n = 0;
    for (let i = 0; i < p.capacity; i++) {
      if ((p.life[i] ?? 0) <= 0) continue;
      const fade = p.fade(i);
      dummy.position.set(p.x[i] ?? 0, p.y[i] ?? 0, zAt(p.s[i] ?? 0, s));
      dummy.scale.setScalar((p.size[i] ?? 0) * (0.3 + fade));
      dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
      m.setColorAt(n, tint.setHex(p.color[i] ?? 0xffffff).multiplyScalar(0.6 + fade));
      n += 1;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, fx.sparks.capacity]}
      frustumCulled={false}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
        toneMapped={false}
      />
    </instancedMesh>
  );
}
