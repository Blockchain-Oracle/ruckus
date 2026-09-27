import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { type Fog, PMREMGenerator, type Texture, type WebGPURenderer } from 'three/webgpu';

import { useLookQuality } from './quality.ts';
import type { FillLight, KeyLight, StadiumLook } from './stadium.ts';
import { useStadium } from './store.ts';

const ROOM_SIGMA = 0.04;
let room: Texture | null = null;
/** The studio room, prefiltered once per session and shared by every look that asks for it. */
function roomEnvironment(renderer: WebGPURenderer) {
  room ??= new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), ROOM_SIGMA).texture;
  return room;
}

/**
 * The scene half of a game's look: background, fog, lights and reflections. Mount it once in the
 * game's scene; it also hands the look to StadiumPost (tone mapping, shadows, bloom, grade).
 * `environment` is the map for `environment.source: 'custom'` (pool's hall HDR).
 */
export function StadiumRig({
  look,
  environment,
}: {
  look: StadiumLook;
  environment?: Texture | null;
}) {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    useStadium.setState({ look });
    return () => {
      if (useStadium.getState().look === look) useStadium.setState({ look: null });
    };
  }, [look]);

  useEffect(() => {
    const env = look.environment;
    if (!env) return;
    const map =
      env.source === 'room'
        ? roomEnvironment(gl as unknown as WebGPURenderer)
        : (environment ?? null);
    if (!map) return;
    scene.environment = map;
    scene.environmentIntensity = env.intensity;
    return () => {
      scene.environment = null;
      scene.environmentIntensity = 1;
    };
  }, [gl, scene, look.environment, environment]);

  const h = look.hemisphere;
  return (
    <>
      <color attach="background" args={[look.background]} />
      {look.fog ? <RigFog fog={look.fog} /> : null}
      {h ? <hemisphereLight args={[h.sky, h.ground, h.intensity]} /> : null}
      {look.key ? <Key light={look.key} /> : null}
      {look.fills?.map((f, i) => (
        // Fills are static per look, so the index is a stable key.
        <Fill key={i} light={f} />
      ))}
    </>
  );
}

/**
 * Fog is plain `scene.fog`: games may drive it (the runner's Fog debuff). With `follow`, near/far
 * track the camera so a far attract pull-back doesn't sink the subject in a fixed fog.
 */
function RigFog({ fog }: { fog: NonNullable<StadiumLook['fog']> }) {
  const ref = useRef<Fog>(null);
  useFrame(({ camera }) => {
    const f = ref.current;
    if (!f || !fog.follow) return;
    const d = camera.position.length();
    f.near = Math.max(fog.near, d + fog.follow.nearPast);
    f.far = Math.max(fog.far, d + fog.follow.farPast);
  });
  return <fog ref={ref} attach="fog" args={[fog.color, fog.near, fog.far]} />;
}

function Key({ light }: { light: KeyLight }) {
  const tier = useLookQuality((s) => s.tier);
  if (light.kind === 'directional')
    return (
      <directionalLight position={light.position} color={light.color} intensity={light.intensity} />
    );
  const shadow = tier === 'high' ? light.shadow : undefined;
  return (
    <spotLight
      position={light.position}
      color={light.color}
      intensity={light.intensity}
      angle={light.angle}
      penumbra={light.penumbra}
      distance={light.distance}
      decay={light.decay}
      castShadow={!!shadow}
      shadow-mapSize-width={shadow?.mapSize ?? 512}
      shadow-mapSize-height={shadow?.mapSize ?? 512}
      shadow-bias={shadow?.bias ?? 0}
      shadow-normalBias={shadow?.normalBias ?? 0}
    />
  );
}

function Fill({ light }: { light: FillLight }) {
  switch (light.kind) {
    case 'ambient':
      return <ambientLight color={light.color} intensity={light.intensity} />;
    case 'directional':
      return (
        <directionalLight
          position={light.position}
          color={light.color}
          intensity={light.intensity}
        />
      );
    case 'point':
      return (
        <pointLight
          position={light.position}
          color={light.color}
          intensity={light.intensity}
          distance={light.distance}
          decay={light.decay ?? 2}
        />
      );
  }
}
