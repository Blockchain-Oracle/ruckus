import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';

import { ChickenBody, type ChickenClip, loadChicken } from '@/engine/characters/chicken.ts';
import { createRenderer } from '@/engine/renderer.ts';

extend(THREE as unknown as Parameters<typeof extend>[0]);

/** ADR-008 player colours (mirrors --player-1..4 in tokens.css). */
const PLAYERS = ['#ff4d4d', '#3d8bff', '#ffc23a', '#3ecf6b'] as const;
const CLIPS: ChickenClip[] = [
  'idle',
  'run',
  'jump',
  'shoot',
  'kick',
  'slide',
  'hit',
  'ko',
  'win',
  'lose',
  'taunt',
  'cheer',
  'dance',
  'walk',
  'fall',
];
const SPACING = 1.35;

function Chickens({ clip, onFps }: { clip: ChickenClip; onFps: (fps: number) => void }) {
  const [bodies, setBodies] = useState<ChickenBody[]>([]);
  const frames = useRef({ n: 0, t: 0 });
  useEffect(() => {
    let live = true;
    void loadChicken().then(() => {
      if (live) setBodies(PLAYERS.map((c) => new ChickenBody(c, 1)));
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    for (const b of bodies) b.play(clip, { restart: true });
  }, [bodies, clip]);
  useEffect(
    () => () => {
      for (const b of bodies) b.dispose();
    },
    [bodies],
  );
  useFrame((_, dt) => {
    for (const b of bodies) b.update(dt);
    const f = frames.current;
    f.n += 1;
    f.t += dt;
    if (f.t >= 1) {
      onFps(Math.round(f.n / f.t));
      f.n = 0;
      f.t = 0;
    }
  });
  return (
    <>
      {bodies.map((b, i) => (
        <primitive
          key={PLAYERS[i]}
          object={b.root}
          position={[(i - 1.5) * SPACING, 0, 0]}
          rotation={[0, -0.35 + i * 0.05, 0]}
        />
      ))}
    </>
  );
}

/** Dev lab (`?debug=chicken`): the ADR-008 cast, every clip, all four tints. */
export function ChickenLab() {
  const [clip, setClip] = useState<ChickenClip>('idle');
  const [fps, setFps] = useState(0);
  return (
    <div className="fixed inset-0 bg-ink">
      <Canvas gl={createRenderer} dpr={[1, 2]} camera={{ fov: 32, position: [0, 1.4, 6.2] }}>
        <color attach="background" args={['#140a1f']} />
        <hemisphereLight args={['#8fa8ff', '#2a1838', 1.1]} />
        <directionalLight position={[3, 5, 4]} intensity={2.2} color="#ffe2b8" />
        <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#b06bff" />
        <mesh rotation-x={-Math.PI / 2} position-y={0}>
          <circleGeometry args={[4.2, 48]} />
          <meshStandardMaterial color="#24163a" />
        </mesh>
        <Chickens clip={clip} onFps={setFps} />
      </Canvas>
      <div className="fixed inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
        {CLIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setClip(c)}
            className={`rounded-full border-2 px-3 py-1.5 font-display text-sm ${c === clip ? 'border-tomato bg-tomato text-cream' : 'border-line bg-ink-2 text-cream'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="fixed top-3 left-3 rounded-full bg-ink-2 px-3 py-1 font-pixel text-xs text-teal">
        {fps} fps
      </div>
    </div>
  );
}
