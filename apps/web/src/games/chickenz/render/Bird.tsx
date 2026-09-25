import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  DoubleSide,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  Shape,
  type Texture,
} from 'three/webgpu';

import { ALIVE_FLAG, Button, FP_ONE, H, P, playerBase } from '@arena/sim-chickenz';

import { DEPTH, MAP_H_PX, MAP_W_PX, SPRITE_FPS, TILE_PX } from '../config.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { ANIMS, type Anim, getSprites, type Hero } from '../sprites.ts';
import { GUN_HOLD } from './guns.ts';
import { lerpPx } from './lerp.ts';
import { launch, newRagdoll, stepRagdoll } from './ragdoll.ts';
import type { Rect } from './terrain.ts';
import { useGunTextures } from './useGunTextures.ts';

const SPRITE_PX = 32;
const BODY_W_PX = 24;
const BODY_H_PX = 32;
const SPRITE_UNITS = SPRITE_PX / TILE_PX;
/** RUCKUS addition: a brief hit flash on damage (Chickenz shows nothing until death). */
const HIT_FLASH_S = 0.3;
/** Below this horizontal speed a grounded bird idles rather than runs (0.5 px/tick). */
const RUN_THRESHOLD_FP = FP_ONE / 2;
const INVINCIBLE_FLAG = 2;
/** Chickenz blink: hidden 3 ticks of every 6, else 60% alpha. */
const BLINK_PERIOD_T = 6;
const BLINK_ALPHA = 0.6;
/** Wall-slide sprites hug the wall by 4 px (except at the map edges). */
const WALL_NUDGE_PX = 4;
/** Taunt: frames 2-6 of the hit strip, once per press. */
const TAUNT_FIRST_FRAME = 2;
const TAUNT_LAST_FRAME = 6;
const GUN_BOB_PX = 0.8;
const SETTLED_DROP_PX = 6;
const RAGDOLL_ALPHA = 0.9;
const SETTLED_ALPHA = 0.5;
/** "Yours" arrow: tomato (Art Bible), bobbing above the marked hero's nameplate. */
const MARKER_COLOR = '#ff5a36';
const MARKER_GAP_PX = 22;
const MARKER_BOB_HZ = 1.6;
const MARKER_SHAPE = (() => {
  const s = new Shape();
  const w = 7 / TILE_PX;
  const h = 8 / TILE_PX;
  s.moveTo(-w, h);
  s.lineTo(w, h);
  s.lineTo(0, 0);
  s.closePath();
  return s;
})();

type Props = {
  hero: Hero;
  slot: number;
  driver: ChickenzDriver;
  platforms: readonly Rect[];
  marked?: boolean;
};

function animFor(v: Int32Array, base: number, hitRecently: boolean, frozen: boolean): Anim {
  if (frozen) return 'idle';
  if (hitRecently) return 'hit';
  if (v[base + P.wallSliding]) return 'wall-jump';
  if (!v[base + P.grounded] && (v[base + P.stompingOn] ?? -1) < 0) {
    // Chickenz only somersaults when unarmed (GameScene.ts:2048); armed birds keep the jump pose.
    const unarmed = (v[base + P.weapon] ?? -1) < 0;
    if ((v[base + P.vy] ?? 0) < 0)
      return (v[base + P.jumpsLeft] ?? 0) === 0 && unarmed ? 'double-jump' : 'jump';
    return 'fall';
  }
  return Math.abs(v[base + P.vx] ?? 0) > RUN_THRESHOLD_FP ? 'run' : 'idle';
}

/**
 * One Pixel Adventure hero driven by the sim view. Each animation is a horizontal strip; stepping
 * `offset.x` over a cloned texture plays it without touching the shared image.
 */
export function Bird({ hero, slot, driver, platforms, marked = false }: Props) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const gun = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
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
  const s = useRef({
    anim: 'idle' as Anim,
    startedAt: 0,
    health: 0,
    hitAt: -1,
    round: -1,
    alive: false,
    tauntAt: -1,
    buttons: 0,
    ragdoll: newRagdoll(),
  });

  useFrame(({ clock }, delta) => {
    const g = group.current;
    const m = body.current;
    if (!g || !m) return;
    const { prev, curr, alpha } = driver;
    const base = playerBase(slot);
    const t = clock.elapsedTime;
    const st = s.current;
    const material = m.material as MeshBasicMaterial;
    const setStrip = (anim: Anim, frame: number) => {
      const texture = strips[anim];
      texture.offset.x = frame / ANIMS[anim];
      if (material.map !== texture) {
        material.map = texture;
        material.needsUpdate = true;
      }
    };

    if (st.round !== driver.round) {
      st.round = driver.round;
      st.health = curr[base + P.health] ?? 0;
      st.alive = ((curr[base + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
      st.ragdoll = newRagdoll();
      g.rotation.z = 0;
    }

    const alive = ((curr[base + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    const facing = (curr[base + P.facing] ?? 1) >= 0 ? 1 : -1;
    const gm = gun.current;

    // Death: fling the body as a ragdoll with the hit animation, then leave it lying there.
    if (st.alive && !alive) {
      launch(
        st.ragdoll,
        (prev[base + P.x] ?? 0) / FP_ONE,
        (prev[base + P.y] ?? 0) / FP_ONE,
        (prev[base + P.vx] ?? 0) / FP_ONE,
        (prev[base + P.vy] ?? 0) / FP_ONE,
        facing,
      );
      st.startedAt = t;
    }
    st.alive = alive;
    if (!alive) {
      const r = st.ragdoll;
      g.visible = r.active || r.settled;
      if (!g.visible) return;
      if (gm) gm.visible = false;
      if (marker.current) marker.current.visible = false;
      stepRagdoll(r, Math.min(delta, 1 / 20), platforms, MAP_W_PX, MAP_H_PX);
      setStrip('hit', Math.min(Math.floor((t - st.startedAt) * SPRITE_FPS), ANIMS.hit - 1));
      material.opacity = r.settled ? SETTLED_ALPHA : RAGDOLL_ALPHA;
      const drop = r.settled ? SETTLED_DROP_PX : 0;
      g.position.set(
        (r.x + BODY_W_PX / 2) / TILE_PX,
        (MAP_H_PX - r.y - BODY_H_PX / 2 - drop) / TILE_PX,
        DEPTH.bird - 0.02,
      );
      g.rotation.z = -r.rotation;
      return;
    }
    g.visible = true;
    g.rotation.z = 0;

    const health = curr[base + P.health] ?? 0;
    if (health < st.health) st.hitAt = t;
    st.health = health;

    // Taunt: edge-triggered, grounded only, frames 2-6 of the hit strip once.
    const buttons = curr[base + P.buttons] ?? 0;
    if (buttons & Button.Taunt && !(st.buttons & Button.Taunt) && curr[base + P.grounded])
      st.tauntAt = t;
    st.buttons = buttons;
    const tauntFrame = TAUNT_FIRST_FRAME + Math.floor((t - st.tauntAt) * SPRITE_FPS);
    const taunting = st.tauntAt >= 0 && tauntFrame <= TAUNT_LAST_FRAME;

    let anim = animFor(curr, base, t - st.hitAt < HIT_FLASH_S, driver.frozen);
    let frame: number;
    if (taunting && anim !== 'hit') {
      anim = 'hit';
      frame = tauntFrame;
    } else {
      if (anim !== st.anim) st.startedAt = t;
      const elapsed = Math.floor((t - st.startedAt) * SPRITE_FPS);
      const oneShot = anim === 'double-jump' || anim === 'hit';
      frame = oneShot ? Math.min(elapsed, ANIMS[anim] - 1) : elapsed % ANIMS[anim];
    }
    st.anim = anim;
    setStrip(anim, frame);

    const invincible = ((curr[base + P.flags] ?? 0) & INVINCIBLE_FLAG) !== 0;
    const tick = curr[H.tick] ?? 0;
    g.visible = !(invincible && tick % BLINK_PERIOD_T < BLINK_PERIOD_T / 2);
    material.opacity = invincible ? BLINK_ALPHA : 1;

    const x = lerpPx(prev, curr, base + P.x, alpha);
    const y = lerpPx(prev, curr, base + P.y, alpha);
    const wallDir = curr[base + P.wallSliding] ? facing : 0;
    const atEdge = x <= 0 || x + BODY_W_PX >= MAP_W_PX;
    const nudge = wallDir && !atEdge ? wallDir * WALL_NUDGE_PX : 0;
    g.position.set(
      (x + BODY_W_PX / 2 + nudge) / TILE_PX,
      (MAP_H_PX - y - SPRITE_PX / 2) / TILE_PX,
      DEPTH.bird,
    );
    g.scale.x = facing;

    const mk = marker.current;
    if (mk) {
      mk.visible = marked;
      mk.scale.x = facing; // undo the group flip so the arrow never mirrors
      mk.position.y =
        (SPRITE_PX / 2 + MARKER_GAP_PX + Math.sin(t * MARKER_BOB_HZ * Math.PI * 2) * 2) / TILE_PX;
    }

    const weapon = curr[base + P.weapon] ?? -1;
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
        gunMat.opacity = material.opacity;
        // Sliding down a wall, the gun points away from it (the sim fires that way too).
        const away = wallDir ? -1 : 1;
        gm.scale.set((away * art.w) / TILE_PX, art.h / TILE_PX, 1);
        // Frame-synced bob on every animation, like Chickenz's gun anchoring.
        const bob = Math.sin((frame / ANIMS[anim]) * Math.PI * 2) * GUN_BOB_PX;
        gm.position.set((away * hold.dx) / TILE_PX, -(hold.dy + bob) / TILE_PX, 0.01);
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
          alphaTest={0.1}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={marker} visible={false}>
        <shapeGeometry args={[MARKER_SHAPE]} />
        <meshBasicMaterial color={MARKER_COLOR} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh ref={gun} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent alphaTest={0.5} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
