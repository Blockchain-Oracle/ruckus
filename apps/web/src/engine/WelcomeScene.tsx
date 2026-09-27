import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three/webgpu';

import { WELCOME_LOOK } from './config.ts';
import { StadiumRig } from './look/StadiumRig.tsx';
import type { CameraRig } from './types.ts';

/** The hub's own backdrop before a game is picked: the arcade room the cabinets stand in. */
export const welcomeRig: CameraRig = {
  fov: 40,
  attract: { target: [0, 1.5, 0], distance: 9.5, height: 1.6, lensShift: -7 },
  play: { position: [0, 2, 7], target: [0, 1.6, 0] },
};

const CABINETS = [
  { x: -3.3, screen: '#ff5a36' },
  { x: -1.1, screen: '#2ec4b6' },
  { x: 1.1, screen: '#8c6bff' },
  { x: 3.3, screen: '#9be15d' },
] as const;

const BODY = '#3b2352';
const FLOOR = '#1b1024';
const SCREEN_FLICKER_HZ = 0.35;

export function WelcomeScene() {
  return (
    <>
      <StadiumRig look={WELCOME_LOOK} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color={FLOOR} roughness={0.85} />
      </mesh>
      {CABINETS.map((c, i) => (
        <Cabinet key={c.x} x={c.x} screen={c.screen} index={i} />
      ))}
    </>
  );
}

function Cabinet({ x, screen, index }: { x: number; screen: string; index: number }) {
  const glow = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mat = glow.current?.material as { emissiveIntensity?: number } | undefined;
    if (!mat) return;
    // Out-of-phase breathing so the room never pulses in unison.
    mat.emissiveIntensity =
      1.6 + 0.4 * Math.sin((clock.elapsedTime * SCREEN_FLICKER_HZ + index * 0.23) * Math.PI * 2);
  });
  return (
    <group position={[x, 0, 0]} rotation={[0, -x * 0.08, 0]}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.7, 2.8, 1.3]} />
        <meshStandardMaterial color={BODY} roughness={0.6} />
      </mesh>
      <mesh ref={glow} position={[0, 1.75, 0.66]} rotation={[-0.18, 0, 0]}>
        <planeGeometry args={[1.3, 1]} />
        <meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, 2.95, 0.1]}>
        <boxGeometry args={[1.7, 0.35, 1.1]} />
        <meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 1.05, 0.72]} rotation={[-0.9, 0, 0]}>
        <boxGeometry args={[1.6, 0.5, 0.08]} />
        <meshStandardMaterial color="#24163a" />
      </mesh>
    </group>
  );
}
