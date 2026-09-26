import { LANE_WIDTH_M } from '@arena/sim-runner';

import type { CameraRig } from '@/engine/types.ts';

import { CAMERA, runnerPose } from './match/camera.ts';

/**
 * Visual tuning for the Runner. The world is drawn around a floating origin: the focus runner
 * (you, or the leader behind the hub menu) always sits at z = 0 and the road streams past, so a
 * 3 km course never strains float precision and the hub's static attract orbit just works.
 * Forward is −z, lane 0 is on the left (x = −2.5).
 */
export const laneX = (lane: number) => (lane - 1) * LANE_WIDTH_M;
/** Course distance → world z around the focus runner. */
export const zAt = (s: number, focusS: number) => focusS - s;

/** Draw window along the course (m behind / ahead of the focus runner). */
export const VIEW_BEHIND_M = 14;
export const VIEW_AHEAD_M = 170;

export const PLAY_FOV_DEG = 64;

export const rig: CameraRig = {
  fov: PLAY_FOV_DEG,
  attract: { target: [0, 1.1, -0.6], distance: 5.2, height: 1.4, lensShift: -6 },
  play: {
    position: [0, CAMERA.up, CAMERA.back],
    target: [0, CAMERA.lookY, -CAMERA.lookAhead],
  },
  pose: runnerPose,
};

/** Runner colours: the hub's four player colours (ART-BIBLE), you are always Tomato. */
export const SLOTS = [
  { color: '#ff5a36', name: 'Tomato' },
  { color: '#2ec4b6', name: 'Teal' },
  { color: '#8c6bff', name: 'Violet' },
  { color: '#9be15d', name: 'Lime' },
] as const;

/** DAG Dasher's palette: Kaspa teal and purple neon on near-black, barrier colours as verbs. */
export const COLORS = {
  sky: '#07060f',
  skyHigh: '#150b2e',
  horizon: '#3a1260',
  fog: '#0b0918',
  road: '#101024',
  grid: '#00d9ff',
  laneLeft: '#00d9ff',
  laneRight: '#9945ff',
  building: '#0c0b1c',
  windowTeal: '#35e7ff',
  windowPurple: '#b07cff',
  windowWarm: '#ffc97a',
  coin: '#ffc23a',
  coinRim: '#fff1b0',
  finish: '#fff1d6',
} as const;

/** The barrier grammar's colours (DAG Dasher's exact hues). */
export const VERB_COLORS = {
  jump: '#00ffff',
  duck: '#ffe600',
  move: '#ff2244',
  strict: '#9945ff',
} as const;

/** Platform colours by size (DAG Dasher: purple, blue, teal, gold). */
export const PLATFORM_COLORS = {
  cube: '#8844ff',
  long: '#44aaff',
  extended: '#00ddaa',
  mega: '#ffdd00',
} as const;

/** The character model stands this tall (the sim's body is 1 m; bodies read better a bit taller). */
export const RUNNER_HEIGHT_VISUAL_M = 1.45;
/** Ghosts (everyone but you) are see-through, so nobody mistakes them for obstacles. */
export const GHOST_OPACITY = 0.55;
/** Visual lane change speed (m/s): the sim's lane is instant, the body glides (KK: 12 m/s). */
export const LANE_GLIDE_MPS = 16;

/** Presentation timings (render time, s). */
export const EXHIBITION_RESTART_S = 2.5;
/** Bot levels for practice: sim skill 0–100. */
export const BOT_LEVELS = { rookie: 25, pro: 65, legend: 95 } as const;
export type BotLevel = keyof typeof BOT_LEVELS;
export const EXHIBITION_SKILLS = [95, 80, 70, 55] as const;
