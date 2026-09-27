import { CEILING, HALF_WIDTH } from '@arena/sim-soccer';

import type { StadiumLook } from '@/engine/look/stadium.ts';
import type { CameraRig } from '@/engine/types.ts';
import { PLAYERS } from '@/ui/game/players.ts';

import { soccerPose } from './match/camera.ts';

/**
 * Visual tuning for Soccer. The sim is side-on game pixels (y up, floor 0, centre 0); the world is
 * that plane at z = 0, scaled so one unit is 100 px. Depth (z) is pure set dressing.
 */
export const PX = 1 / 100;
export const W = (px: number) => px * PX;
export const PITCH_HALF = W(HALF_WIDTH);
export const ROOF = W(CEILING);

/** Pitch framing: the whole width plus this margin always fits (both goals are the game). */
export const FRAME_HALF_W = PITCH_HALF + 0.55;
/** The eye line sits a little above the players so the grass reads and high balls stay in shot. */
export const FRAME_Y = 2.7;
export const PLAY_FOV_DEG = 30;
const REF_ASPECT = 16 / 9;
export const PLAY_DISTANCE =
  FRAME_HALF_W / REF_ASPECT / Math.tan(((PLAY_FOV_DEG / 2) * Math.PI) / 180);

export const rig: CameraRig = {
  fov: PLAY_FOV_DEG,
  attract: { target: [0, 2.2, 0], distance: PLAY_DISTANCE * 0.62, height: 2.2, lensShift: -6 },
  play: { position: [0, FRAME_Y, PLAY_DISTANCE], target: [0, FRAME_Y, 0] },
  pose: soccerPose,
};

/** Kits: the hub's player-1 and player-3 colours; a 2v2 partner wears the lighter shade. */
export const KITS = [
  { body: PLAYERS[0].color, partner: '#ff8a5c', dark: '#7a1f10', band: '#fff1d6', name: 'Tomato' },
  { body: PLAYERS[2].color, partner: '#ab94ff', dark: '#35207a', band: '#fff1d6', name: 'Violet' },
] as const;

export const COLORS = {
  sky: '#0a0718',
  skyGlow: '#2a1650',
  grass: '#2f8f3a',
  grassDark: '#277a31',
  line: '#f4f1e6',
  wall: '#15102a',
  stand: '#1c1633',
  standEdge: '#2b2250',
  goal: '#f7f7f2',
  net: '#e9eef5',
  outline: '#140c1e',
  ice: '#9fe8ff',
  flood: '#fff4d6',
} as const;

/** Night stadium under floodlights; the floodlight lamps and LED boards are what bloom. */
export const LOOK = {
  background: COLORS.sky,
  fog: { color: COLORS.sky, near: 26, far: 60 },
  hemisphere: { sky: '#c8c4ff', ground: '#1c3a1f', intensity: 1.1 },
  key: { kind: 'directional', position: [-4, 10, 9], color: COLORS.flood, intensity: 2.6 },
  fills: [{ kind: 'directional', position: [6, 6, 4], color: '#b9a8ff', intensity: 0.8 }],
  toneMapping: 'neutral',
  exposure: 1,
  post: {
    bloom: { strength: 0.45, radius: 0.4, threshold: 1 },
    vignette: 0.4,
    saturation: 1.06,
    outline: { color: COLORS.outline, thickness: 0.013 },
  },
} as const satisfies StadiumLook;

/** Stage depth layout (world z): pitch runs back to the ad boards, then the stands climb away. */
export const DEPTH = {
  pitchFront: 2.6,
  pitchBack: -2.4,
  boards: -2.55,
  standsFront: -3,
  goalBack: -0.9,
  goalFront: 0.9,
} as const;

/** Presentation timings (render time, s). */
export const SLOWMO_S = 0.55;
export const SLOWMO_SCALE = 0.3;
export const EXHIBITION_RESTART_S = 3;
/** Bot levels for practice: sim difficulty 0–100. */
export const BOT_LEVELS = { rookie: 30, pro: 65, legend: 100 } as const;
export type BotLevel = keyof typeof BOT_LEVELS;
export const EXHIBITION_SKILL = 70;

/**
 * Phone thumbstick (px): it floats to wherever the left thumb lands. Sideways past the dead zone
 * runs, up past the jump line jumps and keeps jumping while held (hold = higher), like Chickenz.
 */
export const STICK = {
  radius: 56,
  knob: 26,
  deadZone: 0.28,
  jumpLine: 0.5,
  /** Where the idle stick waits, from the bottom-left corner: a hint of where the thumb goes. */
  restInset: 92,
} as const;
