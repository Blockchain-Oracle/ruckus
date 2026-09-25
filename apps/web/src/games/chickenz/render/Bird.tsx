import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, type Mesh, type MeshBasicMaterial, type Texture } from 'three/webgpu';

import { DEPTH, MAP_H_PX, SPRITE_FPS, TILE_PX } from '../config.ts';
import { ANIMS, type Anim, getSprites, type Hero } from '../sprites.ts';

const SPRITE_PX = 32;
const SPRITE_UNITS = SPRITE_PX / TILE_PX;

/** Where a bird is and what it's doing, in Chickenz pixel space (top-left of the 24×32 body). */
export type BirdPose = { x: number; y: number; facing: 1 | -1; anim: Anim };

type Props = { hero: Hero; pose: (timeS: number, out: BirdPose) => void };

/**
 * One Pixel Adventure hero. Each animation is a horizontal strip; stepping `offset.x` over a
 * cloned texture plays it without touching the shared image.
 */
export function Bird({ hero, pose }: Props) {
  const mesh = useRef<Mesh>(null);
  const strips = useMemo(() => {
    const source = getSprites().characters[hero];
    const out = {} as Record<Anim, Texture>;
    for (const anim of Object.keys(ANIMS) as Anim[]) {
      const t = source[anim].clone();
      t.repeat.set(1 / ANIMS[anim], 1);
      t.needsUpdate = true;
      out[anim] = t;
    }
    return out;
  }, [hero]);
  const state = useRef<{ pose: BirdPose; anim: Anim; startedAt: number }>({
    pose: { x: 0, y: 0, facing: 1, anim: 'idle' },
    anim: 'idle',
    startedAt: 0,
  });

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const s = state.current;
    const t = clock.elapsedTime;
    pose(t, s.pose);
    if (s.pose.anim !== s.anim) {
      s.anim = s.pose.anim;
      s.startedAt = t;
    }
    const frames = ANIMS[s.anim];
    const frame = Math.floor((t - s.startedAt) * SPRITE_FPS) % frames;
    const texture = strips[s.anim];
    texture.offset.x = frame / frames;
    const material = m.material as MeshBasicMaterial;
    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }
    // Body is 24 px wide inside a 32 px frame; centre the frame on the body.
    m.position.set(
      (s.pose.x + 12) / TILE_PX,
      (MAP_H_PX - s.pose.y - SPRITE_PX / 2) / TILE_PX,
      DEPTH.bird,
    );
    m.scale.x = s.pose.facing;
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[SPRITE_UNITS, SPRITE_UNITS]} />
      <meshBasicMaterial
        map={strips.idle}
        transparent
        alphaTest={0.5}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
