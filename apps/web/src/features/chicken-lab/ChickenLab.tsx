import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';

import { ChickenBody, type ChickenClip, loadChicken } from '@/engine/characters/chicken.ts';
import { StadiumPost } from '@/engine/look/StadiumPost.tsx';
import { StadiumRig } from '@/engine/look/StadiumRig.tsx';
import type { StadiumLook } from '@/engine/look/stadium.ts';
import { createRenderer } from '@/engine/renderer.ts';
import { PLAYER_COLORS } from '@/ui/game/players.ts';

extend(THREE as unknown as Parameters<typeof extend>[0]);

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

/** A floodlit arena: what the cast will stand in from S39 on, outline included. */
const LAB_LOOK = {
  background: '#140a1f',
  hemisphere: { sky: '#8fa8ff', ground: '#2a1838', intensity: 1.1 },
  key: { kind: 'directional', position: [3, 5, 4], color: '#ffe2b8', intensity: 2.2 },
  fills: [{ kind: 'directional', position: [-4, 2, -3], color: '#b06bff', intensity: 0.9 }],
  toneMapping: 'neutral',
  exposure: 1,
  post: {
    bloom: { strength: 0.4, radius: 0.4, threshold: 1 },
    vignette: 0.4,
    saturation: 1.05,
    outline: { color: '#140c1e', thickness: 0.006 },
  },
} as const satisfies StadiumLook;

type Layer = { flap: boolean; lean: boolean; prop: boolean };

/** A stand-in blaster for tuning the hand socket; the real props come with each game (S39). */
function makeBlaster() {
  const g = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: '#ffc23a' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.26), mat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10), mat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.2;
  g.add(body, barrel);
  return g;
}

function Chickens({
  clip,
  layer,
  squashKey,
  onFps,
}: {
  clip: ChickenClip;
  layer: Layer;
  squashKey: number;
  onFps: (fps: number) => void;
}) {
  const [bodies, setBodies] = useState<ChickenBody[]>([]);
  const frames = useRef({ n: 0, t: 0 });
  const props = useMemo(() => new Map<ChickenBody, THREE.Object3D>(), []);
  useEffect(() => {
    let live = true;
    void loadChicken().then(() => {
      if (live) setBodies(PLAYER_COLORS.map((c) => new ChickenBody(c, 1)));
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    for (const b of bodies) b.play(clip, { restart: true });
  }, [bodies, clip]);
  useEffect(() => {
    for (const b of bodies) {
      b.setFlap(layer.flap ? 1 : 0);
      b.setLean(layer.lean ? 0.35 : 0, 0);
      if (layer.prop && !props.has(b)) {
        const anchor = b.attach('RightHand', makeBlaster(), {
          follow: 'position',
          position: [0, 0, 0.08],
        });
        if (anchor) props.set(b, anchor);
      } else if (!layer.prop && props.has(b)) {
        props.get(b)?.removeFromParent();
        props.delete(b);
      }
    }
  }, [bodies, layer, props]);
  useEffect(() => {
    if (squashKey) for (const b of bodies) b.squash(0.35);
  }, [bodies, squashKey]);
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
          key={PLAYER_COLORS[i]}
          object={b.root}
          position={[(i - 1.5) * SPACING, 0, 0]}
          rotation={[0, -0.35 + i * 0.05, 0]}
        />
      ))}
    </>
  );
}

const chip = (on: boolean) =>
  `rounded-full border-2 px-3 py-1.5 font-display text-sm ${on ? 'border-tomato bg-tomato text-cream' : 'border-line bg-ink-2 text-cream'}`;

/** Dev lab (`?debug=chicken`): the ADR-008 cast, every clip and motion layer, all four tints. */
export function ChickenLab() {
  const [clip, setClip] = useState<ChickenClip>('idle');
  const [fps, setFps] = useState(0);
  const [layer, setLayer] = useState<Layer>({ flap: false, lean: false, prop: false });
  const [squashKey, setSquashKey] = useState(0);
  const toggle = (k: keyof Layer) => setLayer((l) => ({ ...l, [k]: !l[k] }));
  return (
    <div className="fixed inset-0 bg-ink">
      <Canvas gl={createRenderer} dpr={[1, 2]} camera={{ fov: 32, position: [0, 1.4, 6.2] }}>
        <StadiumRig look={LAB_LOOK} />
        <StadiumPost />
        <mesh rotation-x={-Math.PI / 2} position-y={0}>
          <circleGeometry args={[4.2, 48]} />
          <meshStandardMaterial color="#24163a" />
        </mesh>
        <Chickens clip={clip} layer={layer} squashKey={squashKey} onFps={setFps} />
      </Canvas>
      <div className="fixed inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3">
        {CLIPS.map((c) => (
          <button key={c} type="button" onClick={() => setClip(c)} className={chip(c === clip)}>
            {c}
          </button>
        ))}
      </div>
      <div className="fixed top-3 right-3 flex gap-2">
        {(['flap', 'lean', 'prop'] as const).map((k) => (
          <button key={k} type="button" onClick={() => toggle(k)} className={chip(layer[k])}>
            {k}
          </button>
        ))}
        <button type="button" onClick={() => setSquashKey((n) => n + 1)} className={chip(false)}>
          squash
        </button>
      </div>
      <div className="fixed top-3 left-3 rounded-full bg-ink-2 px-3 py-1 font-pixel text-xs text-teal">
        {fps} fps
      </div>
    </div>
  );
}
