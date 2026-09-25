import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three/webgpu';

import type { GameSceneProps } from '@/engine/types.ts';

import {
  MAP_H,
  MAP_W,
  PLACEHOLDER_PLATFORMS,
  PLATFORM_BODY,
  PLATFORM_TOP,
  PLAYER_COLORS,
  WALL_COLOR,
} from './config.ts';

const HOP_HZ = 0.9;
const HOP_HEIGHT = 2.2;
const DEPTH = 3;

/** Attract placeholder: a pixel diorama of the arena with four chickens hopping between ledges. */
export function ChickenzScene(_: GameSceneProps) {
  return (
    <>
      <color attach="background" args={['#140b1c']} />
      <hemisphereLight args={['#fff1d6', '#24163a', 1.4]} />
      <directionalLight position={[20, 40, 30]} intensity={2.2} />
      <mesh position={[MAP_W / 2, MAP_H / 2, -DEPTH]}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {PLACEHOLDER_PLATFORMS.map((p) => (
        <group key={`${p.x}:${p.y}`} position={[p.x + p.w / 2, p.y + p.h / 2, 0]}>
          <mesh>
            <boxGeometry args={[p.w, p.h, DEPTH]} />
            <meshStandardMaterial color={PLATFORM_BODY} />
          </mesh>
          <mesh position={[0, p.h / 2, 0]}>
            <boxGeometry args={[p.w, 0.35, DEPTH + 0.05]} />
            <meshStandardMaterial color={PLATFORM_TOP} />
          </mesh>
        </group>
      ))}
      {PLAYER_COLORS.map((color, i) => (
        <Chicken key={color} color={color} index={i} />
      ))}
    </>
  );
}

const PERCHES = [
  [14, 9],
  [46, 9],
  [30, 16],
  [9, 23],
] as const;

function Chicken({ color, index }: { color: string; index: number }) {
  const ref = useRef<Group>(null);
  const [x, y] = PERCHES[index % PERCHES.length] ?? PERCHES[0];
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const phase = (clock.elapsedTime * HOP_HZ + index * 0.27) % 1;
    const hop = Math.sin(phase * Math.PI);
    g.position.y = y + 1 + hop * HOP_HEIGHT;
    // Squash on landing, stretch at take-off, preserving volume (sy = s, sx = 1/s).
    const s = 1 + (0.5 - Math.abs(phase - 0.5)) * 0.35 - (phase < 0.08 ? 0.25 : 0);
    g.scale.set(1 / s, s, 1);
  });
  return (
    <group ref={ref} position={[x, y + 1, 0]}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.45, 0.35, 1.01]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshBasicMaterial color="#1b1024" />
      </mesh>
    </group>
  );
}
