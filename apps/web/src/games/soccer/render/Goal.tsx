import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three/webgpu';

import { CROSSBAR_THICKNESS, GOAL_DEPTH, GOAL_HEIGHT, HALF_WIDTH } from '@arena/sim-soccer';

import { toonGradient } from '@/engine/look/toon.ts';

import { COLORS, DEPTH, W } from '../config.ts';
import type { SoccerFx } from './fx.ts';
import { netTexture } from './textures.ts';

const MOUTH_H = W(GOAL_HEIGHT);
const BAR_T = W(CROSSBAR_THICKNESS);
const DEEP = W(GOAL_DEPTH);
const POST_R = 0.05;
const NET_WIDE = DEPTH.goalFront - DEPTH.goalBack;
/** How far the back net billows (world units) at the moment of a goal. */
const BULGE = 0.28;
const NET_CELLS_PER_UNIT = 5;

/**
 * One goal, drawn at the right end and mirrored for the left. The crossbar is the sim's solid
 * box (players can stand on it), posts mark the mouth, and the net billows when it's scored in.
 */
export function Goal({ side, fx }: { side: 1 | -1; fx: SoccerFx }) {
  const net = useMemo(() => {
    const back = netTexture();
    back.repeat.set(NET_WIDE * NET_CELLS_PER_UNIT, MOUTH_H * NET_CELLS_PER_UNIT);
    const flank = netTexture();
    flank.repeat.set(DEEP * NET_CELLS_PER_UNIT, MOUTH_H * NET_CELLS_PER_UNIT);
    return { back, flank };
  }, []);
  const backNet = useRef<Group>(null);

  useFrame(() => {
    const b = backNet.current;
    if (!b) return;
    const k = fx.net[side === 1 ? 1 : 0];
    // A quick billow out and a wobble back.
    b.position.x = W(HALF_WIDTH) - 0.02 + Math.sin(k * Math.PI) * BULGE * k;
  });

  const mouthX = W(HALF_WIDTH) - DEEP;
  return (
    <group scale={[side, 1, 1]}>
      {/* Crossbar: the solid box above the mouth, with a painted front face. */}
      <mesh position={[mouthX + DEEP / 2, MOUTH_H + BAR_T / 2, 0]}>
        <boxGeometry args={[DEEP, BAR_T, NET_WIDE]} />
        <meshToonMaterial color={COLORS.goal} gradientMap={toonGradient('hard')} />
      </mesh>
      {/* Hazard stripes on the bar's front so it reads as a thing you can bounce off. */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[mouthX + DEEP * (0.2 + i * 0.3), MOUTH_H + BAR_T / 2, NET_WIDE / 2 + 0.002]}
        >
          <planeGeometry args={[DEEP * 0.14, BAR_T * 0.9]} />
          <meshBasicMaterial color="#ff5a36" />
        </mesh>
      ))}
      {/* Posts at the mouth. */}
      {[DEPTH.goalBack, DEPTH.goalFront].map((z) => (
        <mesh key={z} position={[mouthX + POST_R, MOUTH_H / 2, z]}>
          <cylinderGeometry args={[POST_R, POST_R, MOUTH_H, 10]} />
          <meshToonMaterial color={COLORS.goal} gradientMap={toonGradient('hard')} />
        </mesh>
      ))}
      {/* Back net (billows) and side nets. */}
      <group ref={backNet} position={[W(HALF_WIDTH) - 0.02, MOUTH_H / 2, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[NET_WIDE, MOUTH_H]} />
          <meshBasicMaterial map={net.back} transparent depthWrite={false} side={2} opacity={0.8} />
        </mesh>
      </group>
      {[DEPTH.goalBack, DEPTH.goalFront].map((z) => (
        <mesh key={z} position={[mouthX + DEEP / 2, MOUTH_H / 2, z]}>
          <planeGeometry args={[DEEP, MOUTH_H]} />
          <meshBasicMaterial
            map={net.flank}
            transparent
            depthWrite={false}
            side={2}
            opacity={0.7}
          />
        </mesh>
      ))}
      {/* A darker floor inside the goal so the mouth reads as a hole in the wall. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[mouthX + DEEP / 2, 0.004, 0]}>
        <planeGeometry args={[DEEP, NET_WIDE]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}
