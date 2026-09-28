import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import { toonOutlinePass } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { ChickenBody, loadChicken } from '@/engine/characters/chicken.ts';
import { PLAYERS } from '@/ui/game/players.ts';

extend(THREE as unknown as Parameters<typeof extend>[0]);

/** Head-and-shoulders framing: a touch from the side and above, like a fighting-game select card. */
/** `aimM` lifts the look-at above the head bone (which sits at the neck) to take in the comb. */
const FRAME = { distanceM: 1.9, sideM: 0.5, riseM: 0.12, aimM: 0.14, fov: 26 } as const;
/** The pose: this far into the idle clip, so every capture is the same frame. */
const POSE_S = 0.6;
const OUTLINE = { color: '#140c1e', thickness: 0.009 } as const;

async function transparentRenderer(props: object) {
  const r = new THREE.WebGPURenderer({
    ...(props as ConstructorParameters<typeof THREE.WebGPURenderer>[0]),
    antialias: true,
    alpha: true,
  });
  await r.init();
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.NeutralToneMapping;
  return r;
}

function Head({ color }: { color: string }) {
  const { gl, scene, camera } = useThree();
  const [body, setBody] = useState<ChickenBody | null>(null);
  useEffect(() => {
    let live = true;
    void loadChicken().then(() => {
      if (live) setBody(new ChickenBody(color, 1));
    });
    return () => {
      live = false;
    };
  }, [color]);
  useEffect(() => {
    if (!body) return;
    body.play('idle');
    body.update(POSE_S);
    const marker = new THREE.Object3D();
    body.attach('Head', marker);
    body.root.updateWorldMatrix(true, true);
    const head = marker.getWorldPosition(new THREE.Vector3());
    head.y += FRAME.aimM;
    camera.position.set(head.x + FRAME.sideM, head.y + FRAME.riseM, head.z + FRAME.distanceM);
    camera.lookAt(head);
    document.body.dataset.portraitReady = '1';
    return () => body.dispose();
  }, [body, camera]);
  // Transparent background with the cast's ink outline: the outline pass, alpha kept.
  const pipeline = useMemo(() => {
    const pass = toonOutlinePass(scene, camera, new THREE.Color(OUTLINE.color), OUTLINE.thickness);
    return new THREE.RenderPipeline(gl as unknown as THREE.WebGPURenderer, pass);
  }, [gl, scene, camera]);
  useFrame(() => pipeline.render(), 1);
  return body ? <primitive object={body.root} /> : null;
}

/**
 * Dev-only (`?debug=portrait&player=0..3`): one chicken head per player colour on a transparent
 * canvas, for `capture-portraits` to screenshot into the HUD's portrait images.
 */
export function PortraitStudio() {
  const i = Number(new URLSearchParams(window.location.search).get('player') ?? 0);
  const player = PLAYERS[i] ?? PLAYERS[0];
  return (
    <div className="fixed inset-0">
      <Canvas gl={transparentRenderer} dpr={2} camera={{ fov: FRAME.fov, position: [0, 1, 2] }}>
        <hemisphereLight args={['#fff1d6', '#2a1838', 1.3]} />
        <directionalLight position={[2, 3, 4]} intensity={2.4} color="#ffe2b8" />
        <directionalLight position={[-3, 1.5, -2]} intensity={1.1} color="#b06bff" />
        <Head color={player.color} />
      </Canvas>
    </div>
  );
}
