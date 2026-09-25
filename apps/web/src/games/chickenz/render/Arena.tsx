import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { DoubleSide, RepeatWrapping, type Texture } from 'three/webgpu';

import { BG_SCROLL_PX_PER_S, DEPTH, MAP_H, MAP_H_PX, MAP_W, MAP_W_PX, TILE_PX } from '../config.ts';
import { getSprites } from '../sprites.ts';
import { type ArenaLayout, BAKED_H_PX, BAKED_W_PX, bakeArena } from './terrain.ts';

const BG_TILE_PX = 64;

/** Seed → background colour and drift direction, like Chickenz's MapBuilder hash. */
function backgroundFor(seed: number) {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  const angle = (((h >>> 8) & 0xffff) / 0xffff) * Math.PI * 2;
  return { index: h, dir: [Math.cos(angle), Math.sin(angle)] as const };
}

export function Arena({ seed, layout }: { seed: number; layout: ArenaLayout }) {
  const sprites = getSprites();
  const terrain = useMemo(() => bakeArena(sprites.terrain, layout), [sprites, layout]);
  const { background, dir } = useMemo(() => {
    const pick = backgroundFor(seed);
    const source = sprites.backgrounds[pick.index % sprites.backgrounds.length] as Texture;
    const bg = source.clone();
    bg.wrapS = RepeatWrapping;
    bg.wrapT = RepeatWrapping;
    bg.repeat.set(MAP_W_PX / BG_TILE_PX, MAP_H_PX / BG_TILE_PX);
    bg.needsUpdate = true;
    return { background: bg, dir: pick.dir };
  }, [sprites, seed]);

  useFrame((_, delta) => {
    const step = (BG_SCROLL_PX_PER_S * delta) / BG_TILE_PX;
    background.offset.x = (background.offset.x + dir[0] * step) % 1;
    background.offset.y = (background.offset.y + dir[1] * step) % 1;
  });

  return (
    <>
      <mesh position={[MAP_W / 2, MAP_H / 2, DEPTH.background]}>
        <planeGeometry args={[MAP_W, MAP_H]} />
        <meshBasicMaterial map={background} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh position={[MAP_W / 2, MAP_H / 2, DEPTH.terrain]}>
        <planeGeometry args={[BAKED_W_PX / TILE_PX, BAKED_H_PX / TILE_PX]} />
        <meshBasicMaterial
          map={terrain}
          transparent
          alphaTest={0.5}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}
