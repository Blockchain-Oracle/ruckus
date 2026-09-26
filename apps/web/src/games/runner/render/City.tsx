import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, BoxGeometry, Color, type InstancedMesh, Object3D } from 'three/webgpu';

import { COLORS, VIEW_AHEAD_M, VIEW_BEHIND_M, zAt } from '../config.ts';
import { skylineTexture, windowTexture } from './textures.ts';

/** Tower slots: one every 11 m along the road, two rows deep each side. */
const SLOT_M = 11;
const ROWS = [
  { x: 19, jitter: 4 },
  { x: 36, jitter: 8 },
] as const;
const SLOTS_ALONG = Math.ceil((VIEW_AHEAD_M + VIEW_BEHIND_M + 60) / SLOT_M);
/** Tower shapes (w × h × d, m). Windows tile every 4 m across and 8 m up. */
const SHAPES = [
  [7, 22, 7],
  [9, 34, 8],
  [6, 46, 6],
  [11, 16, 10],
] as const;
const PER_SHAPE = SLOTS_ALONG * ROWS.length * 2;
const NEON = ['#00d9ff', '#9945ff', '#ff4fd8', '#ffc23a'] as const;

const dummy = new Object3D();
const tint = new Color();

/** A stable hash per slot: the skyline is the same every run past the same spot. */
const hash = (a: number, b: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) / 4294967296;
};

function shapeGeometry([w, h, d]: readonly [number, number, number]) {
  const g = new BoxGeometry(w, h, d);
  // Scale UVs per face so windows keep their size whatever the tower's proportions.
  const uv = g.getAttribute('uv');
  const faceW = [d, d, w, w, w, w];
  const faceH = [h, h, d, d, h, h];
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4);
    uv.setXY(i, (uv.getX(i) * (faceW[face] ?? w)) / 4, (uv.getY(i) * (faceH[face] ?? h)) / 8);
  }
  g.translate(0, h / 2, 0);
  return g;
}

/** The city: lit towers streaming past both sides, neon crowns, and the far skyline. */
export function City({ focusS }: { focusS: () => number }) {
  const towers = useRef<(InstancedMesh | null)[]>([]);
  const crowns = useRef<InstancedMesh>(null);
  const geometries = useMemo(() => SHAPES.map(shapeGeometry), []);
  const windows = useMemo(() => windowTexture(), []);

  useFrame(() => {
    const s = focusS();
    const first = Math.floor((s - VIEW_BEHIND_M - 20) / SLOT_M);
    const counts = SHAPES.map(() => 0);
    let crownN = 0;
    for (let k = 0; k < SLOTS_ALONG; k++) {
      const slot = first + k;
      ROWS.forEach((row, r) => {
        for (const side of [-1, 1] as const) {
          const h = hash(slot * 4 + r * 2 + (side > 0 ? 1 : 0), 7);
          const shape = Math.floor(h * SHAPES.length);
          const mesh = towers.current[shape];
          if (!mesh) continue;
          const [w, height] = SHAPES[shape] ?? SHAPES[0];
          const x = side * (row.x + w / 2 + hash(slot, r + 11) * row.jitter);
          const z = zAt(slot * SLOT_M + hash(slot, r + 3) * 4, s);
          const tall = 0.8 + hash(slot, r + 5) * 0.5;
          dummy.position.set(x, 0, z);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, tall, 1);
          dummy.updateMatrix();
          const n = counts[shape] ?? 0;
          mesh.setMatrixAt(n, dummy.matrix);
          counts[shape] = n + 1;
          const c = crowns.current;
          if (c && h > 0.35) {
            dummy.position.set(x, height * tall + 0.2, z);
            dummy.scale.set(w + 0.2, 0.25, 1);
            dummy.updateMatrix();
            c.setMatrixAt(crownN, dummy.matrix);
            c.setColorAt(crownN, tint.set(NEON[Math.floor(h * 97) % NEON.length] ?? NEON[0]));
            crownN += 1;
          }
        }
      });
    }
    towers.current.forEach((m, i) => {
      if (!m) return;
      m.count = counts[i] ?? 0;
      m.instanceMatrix.needsUpdate = true;
    });
    const c = crowns.current;
    if (c) {
      c.count = crownN;
      c.instanceMatrix.needsUpdate = true;
      if (c.instanceColor) c.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <instancedMesh
          key={String(i)}
          ref={(m) => {
            towers.current[i] = m;
          }}
          args={[g, undefined, PER_SHAPE]}
          frustumCulled={false}
        >
          <meshStandardMaterial
            map={windows}
            emissiveMap={windows}
            emissive="#ffffff"
            emissiveIntensity={0.85}
            color="#3a3a5a"
            roughness={0.6}
            metalness={0.3}
          />
        </instancedMesh>
      ))}
      <instancedMesh ref={crowns} args={[undefined, undefined, PER_SHAPE]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* The far skyline wraps the horizon (unfogged, so it stays a silhouette on the glow). */}
      <mesh position={[0, 46, 0]}>
        <cylinderGeometry args={[210, 210, 100, 48, 1, true, Math.PI * 0.5, Math.PI]} />
        <meshBasicMaterial map={skylineTexture()} side={BackSide} fog={false} />
      </mesh>
    </group>
  );
}

export const SKY = new Color(COLORS.sky);
