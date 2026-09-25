import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Texture,
} from 'three/webgpu';

import { ALIVE_FLAG, Button, FP_ONE, P, playerBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, SPRITE_FPS, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { ANIMS, type Anim, getSprites, type Hero } from '../sprites.ts';
import { GUN_HOLD } from './guns.ts';
import { lerpPx } from './lerp.ts';
import { useGunTextures } from './useGunTextures.ts';

const SPRITE_PX = 32;
const BODY_W_PX = 24;
const SPRITE_UNITS = SPRITE_PX / TILE_PX;
/** Hit animation plays this long after any HP loss. */
const HIT_FLASH_S = 0.3;
/** Below this horizontal speed a grounded bird idles rather than runs. */
const RUN_THRESHOLD_FP = FP_ONE / 2;

type Props = { hero: Hero; slot: number; driver: ChickenzDriver };

function animFor(v: Int32Array, base: number, hitRecently: boolean): Anim {
  if (hitRecently) return 'hit';
  if ((v[base + P.buttons] ?? 0) & Button.Taunt) return 'hit';
  if (v[base + P.wallSliding]) return 'wall-jump';
  if (!v[base + P.grounded] && (v[base + P.stompingOn] ?? -1) < 0) {
    if ((v[base + P.vy] ?? 0) < 0)
      return (v[base + P.jumpsLeft] ?? 0) === 0 ? 'double-jump' : 'jump';
    return 'fall';
  }
  return Math.abs(v[base + P.vx] ?? 0) > RUN_THRESHOLD_FP ? 'run' : 'idle';
}

/**
 * One Pixel Adventure hero driven by the sim view. Each animation is a horizontal strip; stepping
 * `offset.x` over a cloned texture plays it without touching the shared image.
 */
export function Bird({ hero, slot, driver }: Props) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const gun = useRef<Mesh>(null);
  const guns = useGunTextures();
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
  const s = useRef({ anim: 'idle' as Anim, startedAt: 0, health: 0, hitAt: -1, round: -1 });

  useFrame(({ clock }) => {
    const g = group.current;
    const m = body.current;
    if (!g || !m) return;
    const { prev, curr, alpha } = driver;
    const base = playerBase(slot);
    const t = clock.elapsedTime;
    const st = s.current;

    const alive = ((curr[base + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    g.visible = alive;
    if (!alive) return;

    const health = curr[base + P.health] ?? 0;
    if (st.round !== driver.round) {
      st.round = driver.round;
      st.health = health;
    }
    if (health < st.health) st.hitAt = t;
    st.health = health;

    const anim = animFor(curr, base, t - st.hitAt < HIT_FLASH_S);
    if (anim !== st.anim) {
      st.anim = anim;
      st.startedAt = t;
    }
    const frames = ANIMS[anim];
    const oneShot = anim === 'double-jump' || anim === 'hit';
    const elapsedFrames = Math.floor((t - st.startedAt) * SPRITE_FPS);
    const frame = oneShot ? Math.min(elapsedFrames, frames - 1) : elapsedFrames % frames;
    const texture = strips[anim];
    texture.offset.x = frame / frames;
    const material = m.material as MeshBasicMaterial;
    if (material.map !== texture) {
      material.map = texture;
      material.needsUpdate = true;
    }

    const x = lerpPx(prev, curr, base + P.x, alpha);
    const y = lerpPx(prev, curr, base + P.y, alpha);
    const facing = (curr[base + P.facing] ?? 1) >= 0 ? 1 : -1;
    // Body is 24 px wide inside a 32 px frame; centre the frame on the body.
    g.position.set(
      (x + BODY_W_PX / 2) / TILE_PX,
      (MAP_H_PX - y - SPRITE_PX / 2) / TILE_PX,
      DEPTH.bird,
    );
    g.scale.x = facing;

    const weapon = curr[base + P.weapon] ?? -1;
    const gm = gun.current;
    if (gm) {
      const hold = GUN_HOLD[weapon];
      const art = guns[weapon];
      gm.visible = Boolean(hold && art);
      if (hold && art) {
        const gunMat = gm.material as MeshBasicMaterial;
        if (gunMat.map !== art.texture) {
          gunMat.map = art.texture;
          gunMat.needsUpdate = true;
        }
        gm.scale.set(art.w / TILE_PX, art.h / TILE_PX, 1);
        // Guns bob with the run cycle, a pixel at most (Chickenz frame-synced bob).
        const bob = anim === 'run' ? (frame % 2) * 0.5 : 0;
        gm.position.set(hold.dx / TILE_PX, -(hold.dy + bob) / TILE_PX, 0.01);
      }
    }
  });

  return (
    <group ref={group}>
      <mesh ref={body}>
        <planeGeometry args={[SPRITE_UNITS, SPRITE_UNITS]} />
        <meshBasicMaterial
          map={strips.idle}
          transparent
          alphaTest={0.5}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={gun} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent alphaTest={0.5} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
