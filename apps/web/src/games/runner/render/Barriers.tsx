import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  AdditiveBlending,
  BoxGeometry,
  type BufferGeometry,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
} from 'three/webgpu';

import { BARRIERS, type Entity, isTaken, LANES, laneBlocked, type World } from '@arena/sim-runner';

import { laneX, VERB_COLORS, VIEW_AHEAD_M, VIEW_BEHIND_M, zAt } from '../config.ts';
import { verbIcon } from './textures.ts';

type Verb = keyof typeof VERB_COLORS;
const VERBS = Object.keys(VERB_COLORS) as Verb[];
/** A lane panel is a touch narrower than the lane, so neighbouring panels read as separate. */
const PANEL_W = 2.1;
const POST = 0.12;
const MAX_PANELS = 36;

const box = (w: number, h: number, d: number, x: number, y: number) => {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, 0);
  return g;
};
const posts = (height: number) => [
  box(POST, height, 0.3, -PANEL_W / 2 + POST / 2, height / 2),
  box(POST, height, 0.3, PANEL_W / 2 - POST / 2, height / 2),
];

/**
 * Each verb's silhouette, built around the sim's body bands so what you see is what hits you:
 * a glass slab (the band itself) and a bright frame, plus where the verb's glyph sits.
 */
function shapes(): Record<
  Verb,
  { glass: BufferGeometry; frame: BufferGeometry; icon: { y: number; size: number } }
> {
  const band = (id: keyof typeof BARRIERS) => BARRIERS[id];
  const jump = band('jumpSingle');
  const duck = band('duckSingle');
  const strict = band('duckStrict');
  const wallH = 4;
  const slab = (lo: number, hi: number, d = 0.22) =>
    box(PANEL_W - POST * 2, hi - lo, d, 0, (lo + hi) / 2);
  const bar = (y: number) => box(PANEL_W, 0.1, 0.3, 0, y);
  const merged = (parts: BufferGeometry[]) => {
    const g = mergeGeometries(parts);
    if (!g) throw new Error('barrier frame parts must share attributes');
    return g;
  };
  return {
    jump: {
      glass: slab(jump.minY, jump.maxY),
      frame: merged([...posts(jump.maxY), bar(jump.maxY)]),
      icon: { y: jump.maxY / 2, size: 0.95 },
    },
    duck: {
      glass: slab(duck.minY, duck.maxY),
      frame: merged([...posts(duck.maxY), bar(duck.maxY), bar(duck.minY)]),
      icon: { y: (duck.minY + duck.maxY) / 2, size: 0.8 },
    },
    move: {
      glass: slab(0, wallH, 0.35),
      frame: merged([...posts(wallH), bar(wallH), bar(wallH / 2)]),
      icon: { y: wallH * 0.62, size: 1.5 },
    },
    strict: {
      glass: slab(strict.minY, strict.maxY, 0.3),
      frame: merged([...posts(strict.maxY), bar(strict.maxY), bar(strict.minY)]),
      icon: { y: (strict.minY + strict.maxY) / 2, size: 1.2 },
    },
  };
}

const dummy = new Object3D();

type Refs = {
  glass: InstancedMesh | null;
  frame: InstancedMesh | null;
  icon: InstancedMesh | null;
};

/** Barriers in the colour-is-the-verb grammar, pulsing like DAG Dasher's (0.3 + 0.1·sin 8t). */
export function Barriers({
  world,
  focus,
  focusS,
}: {
  world: () => World;
  focus: () => number;
  focusS: () => number;
}) {
  const geo = useMemo(shapes, []);
  const icons = useMemo(verbIcon, []);
  const refs = useRef<Record<Verb, Refs>>({
    jump: { glass: null, frame: null, icon: null },
    duck: { glass: null, frame: null, icon: null },
    move: { glass: null, frame: null, icon: null },
    strict: { glass: null, frame: null, icon: null },
  });
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const w = world();
    const s = focusS();
    const me = w.runners[focus()];
    const counts: Record<Verb, number> = { jump: 0, duck: 0, move: 0, strict: 0 };
    for (let k = 0; k < w.course.length; k++) {
      const e = w.course[k] as Entity;
      if (e.s < s - VIEW_BEHIND_M) continue;
      if (e.s > s + VIEW_AHEAD_M) break;
      if (e.kind !== 'barrier') continue;
      // One you crashed through is gone (it burst into sparks).
      if (me && isTaken(me, k)) continue;
      const verb = BARRIERS[e.barrier].verb;
      const r = refs.current[verb];
      for (let lane = 0; lane < LANES; lane++) {
        if (!laneBlocked(e.lanes, lane)) continue;
        const n = counts[verb];
        if (n >= MAX_PANELS) break;
        dummy.position.set(laneX(lane), 0, zAt(e.s, s));
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        r.glass?.setMatrixAt(n, dummy.matrix);
        r.frame?.setMatrixAt(n, dummy.matrix);
        const ic = geo[verb].icon;
        dummy.position.y = ic.y;
        dummy.position.z += 0.2;
        dummy.scale.setScalar(ic.size);
        dummy.updateMatrix();
        r.icon?.setMatrixAt(n, dummy.matrix);
        counts[verb] = n + 1;
      }
    }
    const pulse = 0.3 + 0.1 * Math.sin(t.current * 8);
    for (const verb of VERBS) {
      const r = refs.current[verb];
      for (const m of [r.glass, r.frame, r.icon]) {
        if (!m) continue;
        m.count = counts[verb];
        m.instanceMatrix.needsUpdate = true;
      }
      const g = r.glass?.material as MeshBasicMaterial | undefined;
      if (g) g.opacity = pulse + 0.12;
    }
  });

  return (
    <group>
      {VERBS.map((verb) => (
        <group key={verb}>
          <instancedMesh
            ref={(m) => {
              refs.current[verb].glass = m;
            }}
            args={[geo[verb].glass, undefined, MAX_PANELS]}
            frustumCulled={false}
          >
            <meshBasicMaterial
              color={VERB_COLORS[verb]}
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </instancedMesh>
          <instancedMesh
            ref={(m) => {
              refs.current[verb].frame = m;
            }}
            args={[geo[verb].frame, undefined, MAX_PANELS]}
            frustumCulled={false}
          >
            <meshBasicMaterial color={VERB_COLORS[verb]} toneMapped={false} />
          </instancedMesh>
          <instancedMesh
            ref={(m) => {
              refs.current[verb].icon = m;
            }}
            args={[undefined, undefined, MAX_PANELS]}
            frustumCulled={false}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={icons[verb]}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </instancedMesh>
        </group>
      ))}
    </group>
  );
}
