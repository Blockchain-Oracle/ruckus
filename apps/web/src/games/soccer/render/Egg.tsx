import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, MathUtils, type Mesh, type MeshBasicMaterial } from 'three/webgpu';

import { PLAYER_RADIUS, playerRadius } from '@arena/sim-soccer';

import { COLORS, KITS, PX } from '../config.ts';
import type { SoccerDriver } from '../match/driver.ts';
import { EGG_TALL, eggGeometry, outlineMaterial, toonGradient } from './toon.ts';

const OUTLINE_SCALE = 1.07;
/** Squash/stretch spring (per s²) and damping: a quick wobble that settles in ~0.3 s. */
const SPRING_K = 260;
const SPRING_DAMP = 14;
/** Landing speed (px/s) that gives a full squash impulse. */
const LAND_FULL = 750;
const LAND_KICK = 3.2;
const JUMP_KICK = 2.4;
/** Lean into the run (radians at full speed). */
const LEAN_RAD = 0.16;
const RUN_CYCLE_HZ = 7;
const EYE = { x: 0.3, y: 0.42, z: 0.8, r: 0.26, pupil: 0.12, reach: 0.1 } as const;
/** Blinks: every 2.6–4.6 s, 0.12 s long, offset per slot so a team never blinks in unison. */
const BLINK_EVERY_S = 2.6;
const BLINK_SPREAD_S = 2;
const BLINK_S = 0.12;
/** Eyes turn toward the way you face: a 3/4 view on a side-on pitch. */
const FACE_TURN_RAD = 0.42;
const GHOSTS = 3;
const GHOST_LAG_S = 0.045;

type Props = { slot: number; driver: () => SoccerDriver; you: boolean };

/**
 * A code-drawn egg: toon body with an ink outline, eyes that follow the ball, boots that run, and
 * a spring that squashes it on landings and stretches it on take-off. Everything reads the sim;
 * nothing here feeds back into it.
 */
export function Egg({ slot, driver, you }: Props) {
  const team = (slot % 2) as 0 | 1;
  const kit = KITS[team];
  const partner = slot >= 2;
  const geo = useMemo(
    () => eggGeometry(partner ? kit.partner : kit.body, kit.band),
    [kit, partner],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const face = useRef<Group>(null);
  const eyes = useRef<(Group | null)[]>([]);
  const pupils = useRef<(Mesh | null)[]>([]);
  const boots = useRef<(Mesh | null)[]>([]);
  const ice = useRef<Mesh>(null);
  const ghosts = useRef<(Mesh | null)[]>([]);
  const marker = useRef<Group>(null);
  const spring = useRef({
    s: 0,
    v: 0,
    vy: 0,
    grounded: true,
    run: 0,
    t: 0,
    trail: [] as { x: number; y: number }[],
  });

  useFrame((_, delta) => {
    const d = driver();
    const p = d.world.players[slot];
    const g = root.current;
    if (!g) return;
    g.visible = Boolean(p);
    if (!p) return;
    const st = spring.current;
    const dt = Math.min(delta, 0.05);
    st.t += dt;
    const pos = d.playerAt(slot);
    const r = playerRadius(p) * PX;
    g.position.set(pos.x * PX, pos.y * PX, 0);

    // Landing squashes, take-off stretches; a damped spring does the rest.
    if (p.onGround && !st.grounded) st.v -= Math.min(1, -st.vy / LAND_FULL) * LAND_KICK;
    if (!p.onGround && st.grounded && p.vy > 0) st.v += JUMP_KICK;
    st.grounded = p.onGround;
    st.vy = p.vy;
    st.v += (-SPRING_K * st.s - SPRING_DAMP * st.v) * dt;
    st.s += st.v * dt;
    const s = MathUtils.clamp(st.s, -0.35, 0.35);
    const b = body.current;
    if (b) {
      // Squash about the feet so the egg never sinks into the grass.
      b.scale.set(r * (1 - s * 0.6), r * (1 + s), r * (1 - s * 0.6));
      b.position.y = -r + r * EGG_TALL * (1 + s);
      b.rotation.z = MathUtils.damp(b.rotation.z, (-p.vx / 400) * LEAN_RAD, 12, dt);
    }

    // Face: turn a little toward the way we're facing; pupils look at the ball.
    const f = face.current;
    if (f) f.rotation.y = MathUtils.damp(f.rotation.y, p.facing * FACE_TURN_RAD, 10, dt);
    const ball = d.ballAt();
    const lx = ball.x - pos.x;
    const ly = ball.y - (pos.y + PLAYER_RADIUS * 0.5);
    const ll = Math.hypot(lx, ly) || 1;
    const blinkPeriod = BLINK_EVERY_S + ((slot * 0.37) % 1) * BLINK_SPREAD_S;
    const blinking = (st.t + slot * 0.9) % blinkPeriod < BLINK_S;
    const frozen = p.frozen > 0;
    for (let i = 0; i < 2; i++) {
      const e = eyes.current[i];
      if (e) e.scale.y = MathUtils.damp(e.scale.y, blinking || frozen ? 0.12 : 1, 40, dt);
      const pu = pupils.current[i];
      if (pu) pu.position.set((lx / ll) * EYE.reach, (ly / ll) * EYE.reach, EYE.r * 0.6);
    }

    // Boots: a quick scissor while running on the ground, tucked in the air.
    const running = p.onGround && Math.abs(p.vx) > 1;
    st.run += running ? dt * RUN_CYCLE_HZ * Math.PI * 2 * (Math.abs(p.vx) / 250) : 0;
    boots.current.forEach((bt, i) => {
      if (!bt) return;
      const side = i === 0 ? -1 : 1;
      const phase = st.run + (i === 0 ? 0 : Math.PI);
      const stride = running ? Math.sin(phase) * 0.16 * r : 0;
      const lift = running ? Math.max(0, Math.cos(phase)) * 0.12 * r : p.onGround ? 0 : 0.1 * r;
      bt.position.set(side * 0.34 * r + stride * p.facing, -r + 0.09 * r + lift, 0.05 * r);
      bt.scale.setScalar(r);
    });

    if (ice.current) {
      ice.current.visible = frozen;
      ice.current.scale.setScalar(r * 1.32);
      ice.current.position.y = r * 0.18;
    }

    // Speed boost: afterimages in the kit colour, trailing the body.
    st.trail.unshift({ x: pos.x * PX, y: pos.y * PX });
    const lagFrames = Math.max(1, Math.round(GHOST_LAG_S / Math.max(dt, 1 / 240)));
    st.trail.length = Math.min(st.trail.length, GHOSTS * lagFrames + 1);
    ghosts.current.forEach((gh, i) => {
      if (!gh) return;
      const at = st.trail[(i + 1) * lagFrames];
      gh.visible = p.speed > 0 && Boolean(at);
      if (!at) return;
      gh.position.set(at.x - pos.x * PX, at.y - pos.y * PX - r + r * EGG_TALL, -0.05 * (i + 1));
      gh.scale.setScalar(r);
      (gh.material as MeshBasicMaterial).opacity = 0.32 - i * 0.09;
    });

    const m = marker.current;
    if (m) {
      m.visible = you;
      m.position.y = r * (EGG_TALL * 2 - 1) + 0.28 + Math.sin(st.t * 4) * 0.05;
    }
  });

  const bodyColor = partner ? kit.partner : kit.body;
  return (
    <group ref={root}>
      {Array.from({ length: GHOSTS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            ghosts.current[i] = m;
          }}
          geometry={geo}
          visible={false}
        >
          <meshBasicMaterial color={bodyColor} transparent depthWrite={false} />
        </mesh>
      ))}
      <group ref={body}>
        <mesh geometry={geo} castShadow>
          <meshToonMaterial vertexColors gradientMap={toonGradient()} />
        </mesh>
        <mesh geometry={geo} scale={OUTLINE_SCALE} material={outlineMaterial()} />
        {partner && (
          <mesh position={[0, EGG_TALL * 0.55, 0]} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
            <torusGeometry args={[0.9, 0.085, 8, 32]} />
            <meshToonMaterial color={kit.band} gradientMap={toonGradient()} />
          </mesh>
        )}
        <group ref={face} position={[0, 0.18, 0]}>
          {[-1, 1].map((side, i) => (
            <group
              key={side}
              ref={(e) => {
                eyes.current[i] = e;
              }}
              position={[side * EYE.x, EYE.y, EYE.z]}
            >
              <mesh scale={[1, 1.15, 0.55]}>
                <sphereGeometry args={[EYE.r, 20, 14]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh scale={[1.12, 1.26, 0.5]} position={[0, 0, -0.02]}>
                <sphereGeometry args={[EYE.r, 20, 14]} />
                <meshBasicMaterial color={COLORS.outline} />
              </mesh>
              <mesh
                ref={(m) => {
                  pupils.current[i] = m;
                }}
              >
                <circleGeometry args={[EYE.pupil, 18]} />
                <meshBasicMaterial color="#120a18" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.02, EYE.z + 0.06]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.13, 0.035, 6, 16, Math.PI]} />
            <meshBasicMaterial color={COLORS.outline} />
          </mesh>
        </group>
      </group>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            boots.current[i] = m;
          }}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.1, 0.16, 4, 10]} />
          <meshToonMaterial color={kit.dark} gradientMap={toonGradient()} />
        </mesh>
      ))}
      <mesh ref={ice} visible={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={COLORS.ice} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <group ref={marker} visible={false}>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.13, 0.2, 3]} />
          <meshBasicMaterial color="#ffc23a" />
        </mesh>
      </group>
    </group>
  );
}
