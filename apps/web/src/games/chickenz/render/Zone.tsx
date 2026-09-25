import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three/webgpu';

import { FP_ONE, H } from '@arena/sim-chickenz';

import { MAP_H, MAP_W_PX, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';

const ZONE_COLOR = '#ff5a36';
const ZONE_OPACITY = 0.28;
const ZONE_DEPTH = 0.3;

/** Sudden death: translucent walls of danger closing in from both sides. */
export function Zone({ driver }: { driver: ChickenzDriver }) {
  const left = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  useFrame(() => {
    const l = left.current;
    const r = right.current;
    if (!l || !r) return;
    const zl = (driver.curr[H.zoneLeft] ?? 0) / FP_ONE;
    const zr = (driver.curr[H.zoneRight] ?? 0) / FP_ONE;
    const lw = Math.max(zl, 0.001);
    const rw = Math.max(MAP_W_PX - zr, 0.001);
    l.visible = zl > 0;
    r.visible = zr < MAP_W_PX;
    l.scale.x = lw / TILE_PX;
    l.position.x = lw / 2 / TILE_PX;
    r.scale.x = rw / TILE_PX;
    r.position.x = (zr + rw / 2) / TILE_PX;
  });
  return (
    <>
      {[left, right].map((ref, i) => (
        <mesh
          key={i === 0 ? 'l' : 'r'}
          ref={ref}
          position={[0, MAP_H / 2, ZONE_DEPTH]}
          scale={[0.001, MAP_H, 1]}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={ZONE_COLOR}
            transparent
            opacity={ZONE_OPACITY}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
