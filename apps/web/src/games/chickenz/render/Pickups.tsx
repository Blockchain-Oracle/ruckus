import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { DoubleSide, type Mesh, type MeshBasicMaterial } from 'three/webgpu';

import { FP_ONE, H, MAX_PICKUPS, PK, pickupBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { useGunTextures } from './useGunTextures.ts';

/** Chickenz pickup idle: bob sin(tick·0.08)·2 px, alpha 0.9 + sin(tick·0.06)·0.1. */
const BOB_PX = 2;
const BOB_RATE = 0.08;
const SHIMMER_RATE = 0.06;
const SHIMMER_BASE = 0.9;
const SHIMMER_AMP = 0.1;

/** Guns hovering over their pedestals; hidden while a pedestal is recharging. */
export function Pickups({ driver }: { driver: ChickenzDriver }) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const guns = useGunTextures();

  useFrame(() => {
    const v = driver.curr;
    const tick = v[H.tick] ?? 0;
    for (let i = 0; i < MAX_PICKUPS; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const base = pickupBase(i);
      const art = guns[v[base + PK.weapon] ?? -1];
      m.visible =
        Boolean(art) && (v[base + PK.respawnTimer] ?? 1) <= 0 && i < (v[H.pickupCount] ?? 0);
      if (!art || !m.visible) continue;
      const mat = m.material as MeshBasicMaterial;
      if (mat.map !== art.texture) {
        mat.map = art.texture;
        mat.needsUpdate = true;
      }
      const bob = Math.sin(tick * BOB_RATE) * BOB_PX;
      mat.opacity = SHIMMER_BASE + Math.sin(tick * SHIMMER_RATE) * SHIMMER_AMP;
      const x = (v[base + PK.x] ?? 0) / FP_ONE;
      const y = (v[base + PK.y] ?? 0) / FP_ONE + bob;
      m.position.set(x / TILE_PX, (MAP_H_PX - y) / TILE_PX, DEPTH.bird - 0.05);
      m.scale.set(art.w / TILE_PX, art.h / TILE_PX, 1);
    }
  });

  return (
    <>
      {Array.from({ length: MAX_PICKUPS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent alphaTest={0.1} toneMapped={false} side={DoubleSide} />
        </mesh>
      ))}
    </>
  );
}
