import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  DoubleSide,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  Object3D,
} from 'three/webgpu';

import { DEPTH, MAP_H_PX, TILE_PX } from '../config.ts';
import { getSprites } from '../sprites.ts';
import {
  type ChickenzEffects,
  COLLECTED_FRAMES,
  DUST_SCALE_START,
  EXPLOSION_FRAMES,
} from './effects.ts';

const DUST_PX = 16;
const FRAMES_PER_S = 60;
const EXPLOSION_MIN_PX = 20;
const EXPLOSION_MAX_PX = 40;
const EXPLOSION_OUTER = '#ff6600';
const EXPLOSION_INNER = '#ffcc00';
const OUTER_ALPHA = 0.6;
const INNER_ALPHA = 0.4;
const COLLECTED_PX = 32;
const COLLECTED_FPS = 20;
const MAX_RINGS = 8;
const MAX_POPS = 4;
const dummy = new Object3D();
const toWorldY = (y: number) => (MAP_H_PX - y) / TILE_PX;

export function Effects({ effects }: { effects: ChickenzEffects }) {
  const dust = useRef<InstancedMesh>(null);
  const outer = useRef<(Mesh | null)[]>([]);
  const inner = useRef<(Mesh | null)[]>([]);
  const pops = useRef<(Mesh | null)[]>([]);
  const sprites = getSprites();
  const popTextures = useMemo(
    () =>
      Array.from({ length: MAX_POPS }, () => {
        const t = sprites.collected.clone();
        t.repeat.set(1 / COLLECTED_FRAMES, 1);
        t.needsUpdate = true;
        return t;
      }),
    [sprites],
  );

  useFrame((_, delta) => {
    effects.update(delta, delta * FRAMES_PER_S);
    const d = dust.current;
    if (d) {
      const pool = effects.dust;
      let n = 0;
      for (let i = 0; i < pool.capacity; i++) {
        if ((pool.life[i] ?? 0) <= 0) continue;
        const scale = (pool.fade(i) * DUST_SCALE_START * DUST_PX) / TILE_PX;
        dummy.position.set(
          (pool.x[i] ?? 0) / TILE_PX,
          toWorldY(-(pool.y[i] ?? 0)),
          DEPTH.bird + 0.05,
        );
        dummy.scale.set(scale, scale, 1);
        dummy.updateMatrix();
        d.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
      d.count = n;
      d.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < MAX_RINGS; i++) {
      const e = effects.explosions[i];
      const o = outer.current[i];
      const r = inner.current[i];
      if (!o || !r) continue;
      o.visible = Boolean(e);
      r.visible = Boolean(e);
      if (!e) continue;
      const alpha = 1 - e.age / EXPLOSION_FRAMES;
      const radius = EXPLOSION_MAX_PX * (1 - alpha * 0.5);
      const radiusFloor = Math.max(radius, EXPLOSION_MIN_PX);
      o.position.set(e.x / TILE_PX, toWorldY(e.y), DEPTH.bird + 0.2);
      o.scale.setScalar(radiusFloor / TILE_PX);
      (o.material as MeshBasicMaterial).opacity = alpha * OUTER_ALPHA;
      r.position.set(e.x / TILE_PX, toWorldY(e.y), DEPTH.bird + 0.21);
      r.scale.setScalar(radiusFloor / 2 / TILE_PX);
      (r.material as MeshBasicMaterial).opacity = alpha * INNER_ALPHA;
    }

    for (let i = 0; i < MAX_POPS; i++) {
      const p = effects.pops[i];
      const m = pops.current[i];
      if (!m) continue;
      m.visible = Boolean(p);
      if (!p) continue;
      const frame = Math.min(
        Math.floor((p.age / FRAMES_PER_S) * COLLECTED_FPS),
        COLLECTED_FRAMES - 1,
      );
      const tex = popTextures[i];
      if (tex) tex.offset.x = frame / COLLECTED_FRAMES;
      m.position.set(p.x / TILE_PX, toWorldY(p.y), DEPTH.bird + 0.15);
    }
  });

  return (
    <>
      <instancedMesh
        ref={dust}
        args={[undefined, undefined, effects.dust.capacity]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={sprites.dust}
          transparent
          alphaTest={0.05}
          toneMapped={false}
          depthWrite={false}
        />
      </instancedMesh>
      {Array.from({ length: MAX_RINGS }, (_, i) => (
        <group key={`ring-${i.toString()}`}>
          <mesh
            ref={(m) => {
              outer.current[i] = m;
            }}
            visible={false}
          >
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial
              color={EXPLOSION_OUTER}
              transparent
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh
            ref={(m) => {
              inner.current[i] = m;
            }}
            visible={false}
          >
            <circleGeometry args={[1, 24]} />
            <meshBasicMaterial
              color={EXPLOSION_INNER}
              transparent
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      {popTextures.map((tex, i) => (
        <mesh
          key={`pop-${i.toString()}`}
          ref={(m) => {
            pops.current[i] = m;
          }}
          visible={false}
        >
          <planeGeometry args={[COLLECTED_PX / TILE_PX, COLLECTED_PX / TILE_PX]} />
          <meshBasicMaterial
            map={tex}
            transparent
            alphaTest={0.1}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}
