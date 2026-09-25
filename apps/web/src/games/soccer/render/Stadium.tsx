import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, type Texture } from 'three/webgpu';

import { COLORS, DEPTH, PITCH_HALF, ROOF } from '../config.ts';
import { Crowd, TIERS } from './Crowd.tsx';
import type { SoccerFx } from './fx.ts';
import { boardTexture, glowTexture, grassTexture, skyTexture } from './textures.ts';

const GRASS_SPAN = 16;
const GRASS_DEPTH = DEPTH.pitchFront - (DEPTH.standsFront - 0.2);
const BOARD = { h: 0.62, scrollPerS: 0.018 } as const;
const TOWER = { x: 11.5, z: -9.5, h: 12.5 } as const;
const BANK = { cols: 4, rows: 3, cell: 0.42 } as const;

/**
 * Night stadium, side-on: mowed pitch, a scrolling LED ribbon, tiered stands with the crowd,
 * floodlight towers at the corners and a starry sky. The pitch walls are glass: you see the
 * stadium through them, and a bright rim shows where the ball will bounce.
 */
export function Stadium({ fx }: { fx: SoccerFx }) {
  const tex = useMemo(
    () => ({
      grass: grassTexture(GRASS_SPAN, GRASS_DEPTH, DEPTH.pitchFront),
      board: boardTexture(),
      sky: skyTexture(),
      glow: glowTexture(),
    }),
    [],
  );

  useFrame((_, delta) => {
    tex.board.offset.x = (tex.board.offset.x + delta * BOARD.scrollPerS) % 1;
  });

  const standRows = Array.from({ length: TIERS.rows }, (_, row) => row);
  const pitchMidZ = DEPTH.pitchFront - GRASS_DEPTH / 2;

  return (
    <>
      <color attach="background" args={[COLORS.sky]} />
      <fog attach="fog" args={[COLORS.sky, 26, 60]} />
      <hemisphereLight args={['#c8c4ff', '#1c3a1f', 1.1]} />
      <directionalLight position={[-4, 10, 9]} intensity={2.6} color={COLORS.flood} />
      <directionalLight position={[6, 6, 4]} intensity={0.8} color="#b9a8ff" />

      {/* Sky dome backdrop. */}
      <mesh position={[0, 9, -34]}>
        <planeGeometry args={[120, 48]} />
        <meshBasicMaterial map={tex.sky} fog={false} />
      </mesh>

      {/* Pitch. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, pitchMidZ]}>
        <planeGeometry args={[GRASS_SPAN * 2, GRASS_DEPTH]} />
        <meshLambertMaterial map={tex.grass} />
      </mesh>

      {/* LED ad boards along the far touchline. */}
      <mesh position={[0, BOARD.h / 2, DEPTH.boards]}>
        <planeGeometry args={[GRASS_SPAN * 2, BOARD.h]} />
        <meshBasicMaterial map={withRepeat(tex.board, 3)} toneMapped={false} />
      </mesh>
      <mesh position={[0, BOARD.h + 0.03, DEPTH.boards - 0.05]}>
        <boxGeometry args={[GRASS_SPAN * 2, 0.06, 0.12]} />
        <meshLambertMaterial color="#0d0a18" />
      </mesh>

      {/* Stands: a wall under the first tier, then stepped concrete. */}
      <mesh position={[0, TIERS.baseY / 2 + 0.1, DEPTH.standsFront + 0.1]}>
        <boxGeometry args={[TIERS.halfSpan * 2 + 2, TIERS.baseY + 0.2, 0.2]} />
        <meshLambertMaterial color={COLORS.wall} />
      </mesh>
      {standRows.map((row) => (
        <mesh
          key={row}
          position={[
            0,
            TIERS.baseY + row * TIERS.rowRise - 0.12,
            DEPTH.standsFront - row * TIERS.rowDepth - TIERS.rowDepth / 2,
          ]}
        >
          <boxGeometry args={[TIERS.halfSpan * 2 + 2, 0.24, TIERS.rowDepth]} />
          <meshLambertMaterial color={row % 2 ? COLORS.stand : COLORS.standEdge} />
        </mesh>
      ))}
      {/* Back wall and roof lip above the top tier. */}
      <mesh
        position={[
          0,
          TIERS.baseY + TIERS.rows * TIERS.rowRise + 0.8,
          DEPTH.standsFront - TIERS.rows * TIERS.rowDepth - 0.2,
        ]}
      >
        <boxGeometry args={[TIERS.halfSpan * 2 + 2, 2.2, 0.3]} />
        <meshLambertMaterial color={COLORS.wall} />
      </mesh>
      <Crowd fx={fx} />

      {/* Floodlight towers: a lattice mast and a bank of lamps, each lamp blooming into a glow. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * TOWER.x, 0, TOWER.z]}>
          <mesh position={[0, TOWER.h / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.18, TOWER.h, 8]} />
            <meshLambertMaterial color="#2c2640" />
          </mesh>
          <group position={[0, TOWER.h, 0.2]} rotation={[0.35, -side * 0.35, 0]}>
            <mesh>
              <boxGeometry
                args={[BANK.cols * BANK.cell + 0.2, BANK.rows * BANK.cell + 0.2, 0.18]}
              />
              <meshLambertMaterial color="#1a1628" />
            </mesh>
            {Array.from({ length: BANK.cols * BANK.rows }, (_, i) => {
              const cx = (i % BANK.cols) - (BANK.cols - 1) / 2;
              const cy = Math.floor(i / BANK.cols) - (BANK.rows - 1) / 2;
              return (
                <mesh key={i} position={[cx * BANK.cell, cy * BANK.cell, 0.1]}>
                  <planeGeometry args={[BANK.cell * 0.78, BANK.cell * 0.78]} />
                  <meshBasicMaterial color={COLORS.flood} toneMapped={false} />
                </mesh>
              );
            })}
            <sprite scale={[6, 6, 1]} position={[0, 0, 0.4]}>
              <spriteMaterial
                map={tex.glow}
                blending={AdditiveBlending}
                depthWrite={false}
                transparent
                opacity={0.85}
                fog={false}
              />
            </sprite>
          </group>
        </group>
      ))}

      <Walls />
    </>
  );
}

/** Glass end walls above the goals: faint panes with a bright rim where the ball bounces. */
function Walls() {
  const top = ROOF;
  const from = 1.95;
  const h = top - from;
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * PITCH_HALF, from + h / 2, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.8, h]} />
            <meshBasicMaterial
              color="#9fb8ff"
              transparent
              opacity={0.07}
              depthWrite={false}
              side={2}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.05, h, 0.05]} />
            <meshBasicMaterial color="#cfd8ff" transparent opacity={0.3} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function withRepeat(t: Texture, n: number) {
  t.repeat.set(n, 1);
  return t;
}
