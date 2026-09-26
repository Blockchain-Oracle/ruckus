import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, type PerspectiveCamera, Vector3 } from 'three/webgpu';

import { useSettings } from '@/app/stores/settings.ts';
import { uiSound } from '@/lib/audio/index.ts';

import { ATTRACT_ORBIT_RAD_PER_S, ATTRACT_ZOOM, DOLLY_S, ORBIT_UNWIND_RATE } from './config.ts';
import { useGameMachine } from './gameMachine.ts';
import { crossfade } from './scrim.ts';
import type { CameraRig } from './types.ts';

const TAU = Math.PI * 2;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/**
 * Dev-only `?capture`: the attract frames its subject dead centre (no room left for a menu), for
 * recording the hub landing's cabinet previews (tooling/browser-checks/src/capture-previews.ts).
 */
const CAPTURE = import.meta.env.DEV && new URLSearchParams(window.location.search).has('capture');
/** Wrap into (-π, π] so unwinding takes the short way home. */
const wrapAngle = (a: number) => a - TAU * Math.round(a / TAU);

const attractPos = new Vector3();
const attractTarget = new Vector3();
const playPos = new Vector3();
const playTarget = new Vector3();
const lookAt = new Vector3();
/** Follow-cam smoothing (1/s): position snappier than zoom, as Chickenz (0.15 vs 0.05 per frame). */
const FOLLOW_POS_RATE = 9;
const FOLLOW_ZOOM_RATE = 3;
/** World units + zoom: close enough to hand back to the static play pose without a visible cut. */
const HOME_EPS = 0.01;
/** Below this aspect the attract view is too narrow for the scene and pulls back to fit it. */
const PORTRAIT_REF_ASPECT = 1.5;
/** Share of the half-height the scene rises by on tall screens, clearing the stacked menu. */
const PORTRAIT_LIFT = 0.45;

/**
 * One camera for the whole hub. Attract orbits the scene; Play dollies the same camera into the
 * game's framing, so starting a match is a camera move, never a screen change.
 */
export function CameraDirector({ rig }: { rig: CameraRig }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const phase = useGameMachine((s) => s.phase);
  const send = useGameMachine((s) => s.send);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const state = useRef({ angle: 0, blend: 0, fx: Number.NaN, fy: 0, fz: 1 });

  useEffect(() => {
    camera.fov = rig.fov;
    camera.updateProjectionMatrix();
  }, [camera, rig.fov]);

  useEffect(() => {
    if (phase === 'entering' || phase === 'leaving') uiSound('ui.whoosh');
  }, [phase]);

  // Reduced motion swaps the dolly for a scrim cut: same destination, no vestibular sweep.
  useEffect(() => {
    if (!reducedMotion) return;
    if (phase === 'entering' || phase === 'leaving') {
      const to = phase === 'entering' ? 'play' : 'attract';
      void crossfade(() => {
        state.current.blend = to === 'play' ? 1 : 0;
        state.current.angle = 0;
        send(to);
      });
    }
  }, [phase, reducedMotion, send]);

  useFrame((_, delta) => {
    const s = state.current;
    const { attract, play } = rig;

    if (phase === 'attract' || phase === 'leaving') {
      s.angle = wrapAngle(s.angle + ATTRACT_ORBIT_RAD_PER_S * delta);
    } else {
      s.angle = MathUtils.damp(s.angle, 0, ORBIT_UNWIND_RATE, delta);
    }

    if (!reducedMotion) {
      const towardPlay = phase === 'entering' || phase === 'play' || phase === 'results';
      s.blend = MathUtils.clamp(s.blend + (towardPlay ? delta : -delta) / DOLLY_S, 0, 1);
      if (phase === 'entering' && s.blend === 1) send('play');
      if (phase === 'leaving' && s.blend === 0) send('attract');
    }

    // Tall screens: pull back until the scene's width fits, and lift it above the bottom menu.
    const pullBack = Math.max(1, PORTRAIT_REF_ASPECT / camera.aspect);
    const distance = attract.distance * ATTRACT_ZOOM * pullBack;
    attractTarget.set(...attract.target);
    if (pullBack > 1) {
      const halfH = distance * Math.tan(MathUtils.degToRad(camera.fov / 2));
      attractTarget.y -= PORTRAIT_LIFT * halfH * Math.min(1, pullBack - 1);
    }
    attractPos.set(
      attractTarget.x + Math.sin(s.angle) * distance,
      attractTarget.y + attract.height * ATTRACT_ZOOM,
      attractTarget.z + Math.cos(s.angle) * distance,
    );
    playPos.set(...play.position);
    playTarget.set(...play.target);
    const pose = phase === 'attract' ? null : (rig.pose?.(camera.aspect) ?? null);
    if (pose) {
      playPos.set(...pose.position);
      playTarget.set(...pose.target);
    }
    const follow = phase === 'attract' || pose ? null : (rig.follow?.(camera.aspect) ?? null);
    // Once following, a null follow eases back to the static pose instead of cutting to it.
    const easingHome = !follow && !pose && !Number.isNaN(s.fx) && phase !== 'attract';
    if (follow || easingHome) {
      if (Number.isNaN(s.fx)) {
        s.fx = play.target[0];
        s.fy = play.target[1];
        s.fz = 1;
      }
      const goal = follow ?? { x: play.target[0], y: play.target[1], zoom: 1 };
      s.fx = MathUtils.damp(s.fx, goal.x, FOLLOW_POS_RATE, delta);
      s.fy = MathUtils.damp(s.fy, goal.y, FOLLOW_POS_RATE, delta);
      s.fz = MathUtils.damp(s.fz, goal.zoom, FOLLOW_ZOOM_RATE, delta);
      const distance = (play.position[2] - play.target[2]) / s.fz;
      playTarget.set(s.fx, s.fy, play.target[2]);
      playPos.set(s.fx, s.fy, play.target[2] + distance);
      const home =
        Math.abs(s.fx - goal.x) + Math.abs(s.fy - goal.y) + Math.abs(s.fz - goal.zoom) < HOME_EPS;
      if (easingHome && home) s.fx = Number.NaN;
    } else {
      s.fx = Number.NaN;
    }

    const t = easeInOutCubic(s.blend);
    camera.position.lerpVectors(attractPos, playPos, t);
    lookAt.lerpVectors(attractTarget, playTarget, t);
    camera.lookAt(lookAt);
    // The side shift makes room for a left-hand menu; stacked (tall) layouts put it below instead.
    const wide = MathUtils.clamp((camera.aspect - 1) / (PORTRAIT_REF_ASPECT - 1), 0, 1);
    const shift = CAPTURE ? 0 : (attract.lensShift ?? 0) * wide * (1 - t);
    if (camera.filmOffset !== shift) {
      camera.filmOffset = shift;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
