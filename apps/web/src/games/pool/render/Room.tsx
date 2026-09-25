import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import {
  ACESFilmicToneMapping,
  EquirectangularReflectionMapping,
  NeutralToneMapping,
  PCFSoftShadowMap,
  type Texture,
} from 'three/webgpu';

import hdrUrl from '../assets/billiard_hall_1k.hdr?url';
import { COLORS, SURFACE_Y } from '../config.ts';

/** Cinematic grade for Pool only; restored when the scene leaves (Chickenz stays flat and unlit). */
const EXPOSURE = 0.95;
/** The HDRI lights reflections but stays dim: the pendant over the table is the key light. */
const ENV_INTENSITY = 0.35;
const LAMP_Y = SURFACE_Y + 1.05;

let hdr: Promise<Texture> | null = null;
export const loadPoolEnvironment = () => {
  hdr ??= new HDRLoader().loadAsync(hdrUrl).then((t) => {
    t.mapping = EquirectangularReflectionMapping;
    return t;
  });
  return hdr;
};

/** The lamp body frames the attract shot; in play it would sit between the camera and the table. */
export function Room({ showLamp }: { showLamp: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const r = gl as unknown as {
      toneMapping: number;
      toneMappingExposure: number;
      shadowMap: { enabled: boolean; type: number };
    };
    const prev = { tm: r.toneMapping, ex: r.toneMappingExposure, sh: r.shadowMap.enabled };
    r.toneMapping = ACESFilmicToneMapping;
    r.toneMappingExposure = EXPOSURE;
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFSoftShadowMap;
    let alive = true;
    void loadPoolEnvironment().then((t) => {
      if (!alive) return;
      scene.environment = t;
      scene.environmentIntensity = ENV_INTENSITY;
    });
    return () => {
      alive = false;
      r.toneMapping = prev.tm ?? NeutralToneMapping;
      r.toneMappingExposure = prev.ex;
      r.shadowMap.enabled = prev.sh;
      scene.environment = null;
    };
  }, [gl, scene]);

  return (
    <>
      <color attach="background" args={[COLORS.room]} />
      <fog attach="fog" args={[COLORS.room, 4, 11]} />
      <hemisphereLight args={['#c9d6ff', '#2a1a12', 0.35]} />
      {/* The pendant: a long shade over the table, warm key light with soft shadows. */}
      <spotLight
        position={[0, LAMP_Y + 0.6, 0]}
        angle={0.95}
        penumbra={0.75}
        intensity={26}
        distance={6}
        decay={1.2}
        color="#ffe2b0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00012}
        shadow-normalBias={0.015}
      />
      <pointLight
        position={[-0.75, LAMP_Y, 0]}
        intensity={1.6}
        distance={2.4}
        decay={1.6}
        color="#ffd9a0"
      />
      <pointLight
        position={[0.75, LAMP_Y, 0]}
        intensity={1.6}
        distance={2.4}
        decay={1.6}
        color="#ffd9a0"
      />
      <directionalLight position={[-2.5, 2.6, 3]} intensity={0.35} color="#9fc2ff" />
      <directionalLight position={[3, 3.2, -3.5]} intensity={0.45} color="#bcd6ff" />
      <mesh position={[0, LAMP_Y + 0.05, 0]} visible={showLamp}>
        <boxGeometry args={[2.0, 0.06, 0.26]} />
        <meshStandardMaterial color="#141414" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, LAMP_Y + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]} visible={showLamp}>
        <planeGeometry args={[2.0, 0.26]} />
        <meshBasicMaterial color="#fff1d0" toneMapped={false} />
      </mesh>
      {/* Floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.8} />
      </mesh>
    </>
  );
}
