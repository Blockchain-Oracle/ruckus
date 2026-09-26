import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, type Group, type Mesh, type MeshBasicMaterial } from 'three/webgpu';

import { BASE_SPEED_MPS, coastSpeed, type SimEvent, speedOf } from '@arena/sim-runner';

import { LANE_GLIDE_MPS, laneX, SLOTS, zAt } from '../config.ts';
import type { RunnerDriver } from '../match/driver.ts';
import { focusView } from '../match/runtime.ts';
import { useRunnerPrefs } from '../prefs.ts';
import { RunnerBody } from './character.ts';

const MAX_RUNNERS = 4;
/** Lean into a lane change (KK rolled by −dx·0.3; a body reads better with less). */
const LEAN = 0.09;
/** How long the stumble plays after a hit, and the slam's roll after touching down. */
const HIT_S = 0.5;
const ROLL_S = 0.55;
const JUMP_START_S = 0.18;
const HIT_BLINK_HZ = 14;
/** Ghosts start fading inside this range of you (m) and are faint at their closest. */
const GHOST_NEAR_M = 0.6;
const GHOST_FADE_M = 2.4;
const GHOST_NEAR_MIN = 0.12;
const GHOST_BEHIND_M = 9;
/** How quickly a finisher turns to face the camera (1/s). */
const TURN_RATE = 5;

type Beat = { hit: number; jump: number; slam: number; x: number; lastX: number };

/**
 * Every runner on the road. You are solid and lit; the others are ghosts in their colours, racing
 * the same course on top of yours (they never collide). Clips follow sim state each frame.
 */
export function Runners({
  driver,
  events,
}: {
  driver: () => RunnerDriver;
  events: () => readonly SimEvent[];
}) {
  const bodies = useMemo(() => SLOTS.map((s) => new RunnerBody(s.color)), []);
  const beats = useRef<Beat[]>(
    Array.from({ length: MAX_RUNNERS }, () => ({ hit: 9, jump: 9, slam: 9, x: 0, lastX: 0 })),
  );
  const holders = useRef<(Group | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);
  const ghosts = useRunnerPrefs((s) => s.ghosts);
  const t = useRef(0);

  useEffect(
    () => () => {
      for (const b of bodies) b.dispose();
    },
    [bodies],
  );

  useFrame((_, delta) => {
    t.current += delta;
    const d = driver();
    const w = d.world;
    const focus = d.focus;
    const focusS = d.focusS();
    for (const e of events()) {
      if (!('runner' in e)) continue;
      const b = beats.current[e.runner];
      if (!b) continue;
      if (e.kind === 'hit' && !e.shielded) b.hit = 0;
      else if (e.kind === 'jump') b.jump = 0;
      else if (e.kind === 'slam') b.slam = -1;
      else if (e.kind === 'land' && b.slam < 0) b.slam = 0;
    }
    bodies.forEach((body, i) => {
      const holder = holders.current[i];
      const r = w.runners[i];
      const b = beats.current[i];
      if (!holder || !b) return;
      const hideGhost = !ghosts && i !== focus && d.humanSlot >= 0;
      holder.visible = Boolean(r) && !hideGhost;
      if (!r || !holder.visible) return;
      for (const k of ['hit', 'jump'] as const) b[k] += delta;
      if (b.slam >= 0) b.slam += delta;

      // The sim's lane is instant; the body glides across and leans into it.
      const target = laneX(r.lane);
      const step = LANE_GLIDE_MPS * delta;
      b.lastX = b.x;
      b.x = Math.abs(target - b.x) <= step ? target : b.x + Math.sign(target - b.x) * step;
      const pose = d.poseOf(i);
      holder.position.set(b.x, pose.y, zAt(pose.s, focusS));
      holder.rotation.z = -Math.sign(b.x - b.lastX) * (b.x === target ? 0 : LEAN);
      body.setGhost(i !== focus);
      if (i !== focus) {
        // Near you a ghost melts away (Mario Kart style), so it never paints over your body.
        const me = beats.current[focus];
        const ds = pose.s - d.poseOf(focus).s;
        const dx = b.x - (me?.x ?? b.x);
        const near = Math.sqrt(ds * ds + dx * dx);
        // Behind you a ghost is between you and the camera: it fades out over those metres too.
        const behind = ds < 0 ? Math.max(GHOST_NEAR_MIN, 1 + ds / GHOST_BEHIND_M) : 1;
        body.setGhostFade(
          Math.min(1, Math.max(GHOST_NEAR_MIN, (near - GHOST_NEAR_M) / GHOST_FADE_M)) * behind,
        );
      }

      const coast = r.finished >= 0 ? coastSpeed(w, r) : 0;
      const speed = r.finished >= 0 ? coast : r.out ? 0 : speedOf(r);
      if (i === focus) {
        focusView.x = b.x;
        focusView.y = pose.y;
        focusView.speed = w.phase === 'run' ? speed : 0;
      }
      // Stopped past the line, the winner turns round to celebrate to the camera.
      const facing = r.finished >= 0 && coast < 0.5 ? 0 : Math.PI;
      body.root.rotation.y += (facing - body.root.rotation.y) * Math.min(1, delta * TURN_RATE);
      body.play(...pickClip(w.phase, r, b, speed, coast));
      body.update(delta);
      // Flicker while invulnerable after a hit (the classic "you're safe for a second" read).
      body.root.visible =
        r.out || !(r.invulnerable > 0 && Math.floor(t.current * HIT_BLINK_HZ) % 2 === 0);
      const ring = rings.current[i];
      if (ring) {
        ring.position.y = (r.platform >= 0 ? pose.y : 0) - pose.y + 0.02;
        (ring.material as MeshBasicMaterial).opacity = i === focus ? 0.55 : 0.3;
      }
    });
  });

  return (
    <group>
      {bodies.map((body, i) => (
        <group
          key={body.root.uuid}
          ref={(g) => {
            holders.current[i] = g;
          }}
        >
          <primitive object={body.root} />
          {/* A glow ring on the road under each runner, in its colour. */}
          <mesh
            ref={(m) => {
              rings.current[i] = m;
            }}
            rotation-x={-Math.PI / 2}
            position-y={0.02}
          >
            <ringGeometry args={[0.32, 0.55, 32]} />
            <meshBasicMaterial
              color={SLOTS[i]?.color ?? '#fff'}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

type Runner = RunnerDriver['world']['runners'][number];

/** Which clip a runner's state calls for, and how fast to play it. */
function pickClip(
  phase: RunnerDriver['world']['phase'],
  r: Runner,
  b: Beat,
  speed: number,
  coast: number,
): [Parameters<RunnerBody['play']>[0], number?] {
  if (r.out) return ['wipeout'];
  if (r.finished >= 0) {
    if (!r.grounded) return ['jumpAir'];
    return coast > 0.5 ? ['run', Math.max(0.6, coast / 30)] : ['dance'];
  }
  if (phase === 'countdown') return ['idle'];
  if (b.hit < HIT_S) return ['hit', 1.4];
  if (b.slam >= 0 && b.slam < ROLL_S) return ['roll', 1.5];
  if (!r.grounded) return [b.jump < JUMP_START_S ? 'jumpStart' : 'jumpAir', 1.2];
  if (r.ducking) return ['slide'];
  // Cadence follows speed: a sprint at 15 m/s speeds up as the road does.
  return ['run', Math.min(1.7, 0.85 + (speed - BASE_SPEED_MPS) / 40)];
}
