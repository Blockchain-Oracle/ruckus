import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type InstancedMesh, Object3D } from 'three/webgpu';

import { FP_ONE, H, MAX_PROJECTILES, PR, projectileBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { BULLET_PX } from './guns.ts';

const OUTLINE_PX = 1;
const BULLET_COLOR = new Color('#fff1d6');
const ROCKET_COLOR = new Color('#ff5a36');
const OUTLINE_COLOR = new Color('#211f30');
const ROCKET = 3;
const dummy = new Object3D();

/**
 * Bullets as two instanced quads (dark outline behind a bright core), Chickenz's look, in two
 * draw calls however many are in flight. Positions interpolate between ticks by projectile id.
 */
export function Projectiles({ driver }: { driver: ChickenzDriver }) {
  const core = useRef<InstancedMesh>(null);
  const outline = useRef<InstancedMesh>(null);

  useFrame(() => {
    const c = core.current;
    const o = outline.current;
    if (!c || !o) return;
    const { prev, curr, alpha } = driver;
    const count = curr[H.projCount] ?? 0;
    const prevCount = prev[H.projCount] ?? 0;
    for (let i = 0; i < count; i++) {
      const base = projectileBase(i);
      const id = curr[base + PR.id];
      // Slots compact as bullets die, so find this bullet's previous slot by id.
      let prevIndex = -1;
      for (let j = 0; j < prevCount; j++) if (prev[projectileBase(j) + PR.id] === id) prevIndex = j;
      const x =
        prevIndex >= 0
          ? interp(prev, curr, projectileBase(prevIndex) + PR.x, base + PR.x, alpha)
          : (curr[base + PR.x] ?? 0) / FP_ONE;
      const y =
        prevIndex >= 0
          ? interp(prev, curr, projectileBase(prevIndex) + PR.y, base + PR.y, alpha)
          : (curr[base + PR.y] ?? 0) / FP_ONE;
      const weapon = curr[base + PR.weapon] ?? 0;
      const size = BULLET_PX[weapon] ?? BULLET_PX[0];
      const angle = Math.atan2(-(curr[base + PR.vy] ?? 0), curr[base + PR.vx] ?? 1);
      dummy.position.set(x / TILE_PX, (MAP_H_PX - y) / TILE_PX, DEPTH.bird + 0.1);
      dummy.rotation.set(0, 0, angle);
      dummy.scale.set(size.w / TILE_PX, size.h / TILE_PX, 1);
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);
      c.setColorAt(i, weapon === ROCKET ? ROCKET_COLOR : BULLET_COLOR);
      dummy.position.z -= 0.01;
      dummy.scale.set((size.w + 2 * OUTLINE_PX) / TILE_PX, (size.h + 2 * OUTLINE_PX) / TILE_PX, 1);
      dummy.updateMatrix();
      o.setMatrixAt(i, dummy.matrix);
    }
    c.count = count;
    o.count = count;
    c.instanceMatrix.needsUpdate = true;
    o.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={outline}
        args={[undefined, undefined, MAX_PROJECTILES]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={OUTLINE_COLOR} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={core}
        args={[undefined, undefined, MAX_PROJECTILES]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

const interp = (
  prev: Int32Array,
  curr: Int32Array,
  prevIndex: number,
  currIndex: number,
  alpha: number,
) => {
  const a = prev[prevIndex] ?? 0;
  const b = curr[currIndex] ?? 0;
  return (a + (b - a) * alpha) / FP_ONE;
};
