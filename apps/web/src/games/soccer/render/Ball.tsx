import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group, MathUtils, type Mesh, type MeshBasicMaterial } from 'three/webgpu';

import { ballRadius, playerRadius } from '@arena/sim-soccer';

import { toonGradient } from '@/engine/look/toon.ts';

import { PX } from '../config.ts';
import type { SoccerDriver } from '../match/driver.ts';
import { footballTexture } from './toon.ts';

/** Contact shadows fade out and spread as things rise (world units of height). */
const SHADOW_FADE_H = 3.2;
const SHADOW_ALPHA = 0.42;
const MAX_SHADOWS = 5;

/** The football: rolls exactly as far as it travels, glows while bouncy. */
export function Ball({ driver }: { driver: () => SoccerDriver }) {
  const g = useRef<Group>(null);
  const spin = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const last = useRef({ x: 0, t: 0 });

  useFrame((_, delta) => {
    const d = driver();
    const w = d.world;
    const pos = d.ballAt();
    const r = ballRadius(w) * PX;
    const root = g.current;
    if (!root) return;
    root.position.set(pos.x * PX, pos.y * PX, 0);
    root.scale.setScalar(MathUtils.damp(root.scale.x || r, r, 14, delta));
    const s = spin.current;
    if (s) {
      // Rolling without slipping: angle = distance / radius (clockwise when moving right).
      const dx = pos.x * PX - last.current.x;
      if (Math.abs(dx) < 1) s.rotation.z -= dx / r;
    }
    last.current.x = pos.x * PX;
    last.current.t += delta;
    const gl = glow.current;
    if (gl) {
      gl.visible = w.ballBouncy > 0;
      gl.scale.setScalar(1.35 + Math.sin(last.current.t * 12) * 0.08);
    }
  });

  return (
    <group ref={g}>
      <mesh ref={spin} castShadow>
        <sphereGeometry args={[1, 32, 20]} />
        <meshToonMaterial map={footballTexture()} gradientMap={toonGradient('hard')} />
      </mesh>
      <mesh ref={glow} visible={false}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshBasicMaterial color="#ffe14a" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Soft blob shadows on the grass under the ball and every egg. */
export function Shadows({ driver }: { driver: () => SoccerDriver }) {
  const blobs = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const d = driver();
    const w = d.world;
    const items = [
      { ...d.ballAt(), r: ballRadius(w) },
      ...w.players.map((p, i) => ({ ...d.playerAt(i), r: playerRadius(p) })),
    ];
    for (let i = 0; i < MAX_SHADOWS; i++) {
      const m = blobs.current[i];
      if (!m) continue;
      const it = items[i];
      m.visible = Boolean(it);
      if (!it) continue;
      const h = Math.max(0, it.y - it.r) * PX;
      const k = Math.max(0, 1 - h / SHADOW_FADE_H);
      m.position.set(it.x * PX, 0.006, 0.02);
      m.scale.set(it.r * PX * (1.15 + (1 - k) * 0.6), it.r * PX * 0.42, 1);
      (m.material as MeshBasicMaterial).opacity = SHADOW_ALPHA * k;
    }
  });
  return (
    <>
      {Array.from({ length: MAX_SHADOWS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            blobs.current[i] = m;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color="#000000" transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
