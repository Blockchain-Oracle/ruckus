import { use } from 'react';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { Color, EquirectangularReflectionMapping, type Texture } from 'three/webgpu';

import { StadiumRig } from '@/engine/look/StadiumRig.tsx';

import hdrUrl from '../assets/billiard_hall_1k.hdr?url';
import { COLORS, LAMP_Y, LOOK } from '../config.ts';

/** The shade's underside is the light source: HDR, so the bloom picks it up and nothing else. */
const SHADE_HDR = 2.5;
const shade = new Color('#fff1d0').multiplyScalar(SHADE_HDR);

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
  // Preloaded before the scrim lifts, so this resolves without suspending.
  const environment = use(loadPoolEnvironment());
  return (
    <>
      <StadiumRig look={LOOK} environment={environment} />
      <mesh position={[0, LAMP_Y + 0.05, 0]} visible={showLamp}>
        <boxGeometry args={[2.0, 0.06, 0.26]} />
        <meshStandardMaterial color="#141414" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, LAMP_Y + 0.015, 0]} rotation={[Math.PI / 2, 0, 0]} visible={showLamp}>
        <planeGeometry args={[2.0, 0.26]} />
        <meshBasicMaterial color={shade} />
      </mesh>
      {/* Floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.8} />
      </mesh>
    </>
  );
}
