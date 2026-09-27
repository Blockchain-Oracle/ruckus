import { HALF_L, HALF_W } from '@arena/sim-pool';

import type { StadiumLook } from '@/engine/look/stadium.ts';
import type { CameraRig } from '@/engine/types.ts';

import { poolPose } from './match/camera.ts';

/**
 * Visual tuning for Pool. World units are metres. The sim's (x, y, up) maps to world (x, up, −y):
 * a proper rotation, so spin, english and left/right read exactly as the physics has them.
 */
export const worldZ = (simY: number) => -simY;
export const simY = (worldZ: number) => -worldZ;

/** Cloth surface height, so the table sits at a believable 0.8 m in the room. */
export const SURFACE_Y = 0.8;
/** Cushion nose height above the cloth (matches the sim's Han contact height). */
export const CUSHION_TOP = 0.037;
/** Cushion depth from nose to wood. */
export const CUSHION_W = 0.05;
/** Wooden rail width and height above the cushions. */
export const RAIL_W = 0.13;
export const RAIL_TOP = CUSHION_TOP + 0.006;
/** Apron (the table body under the rails). */
export const APRON_H = 0.24;
/** Pocket cups. */
export const CORNER_POCKET_R = 0.068;
export const SIDE_POCKET_R = 0.064;
/** Pocket-hole centres sit this far behind the cushion line. */
export const CORNER_POCKET_OUT = 0.035;
export const SIDE_POCKET_OUT = 0.045;

export const COLORS = {
  cloth: '#0b3e54',
  clothShadow: '#154f66',
  rail: '#3a1f14',
  railGrain: '#5b3120',
  apron: '#24130c',
  pocket: '#050505',
  leather: '#1b120d',
  diamond: '#e9e2d0',
  floor: '#140c10',
  room: '#07050a',
} as const;

/** WPA ball colours (1-7 solids, 9-15 the same hues as stripes). */
export const BALL_HUES = [
  '#f2ecd9',
  '#f5b700',
  '#1b4bb8',
  '#d42a1e',
  '#4f2a8a',
  '#ee6a15',
  '#16804a',
  '#7d1c22',
  '#101010',
] as const;

/** Attract: a slow orbit round the table; play poses come from the aim camera. */
export const rig: CameraRig = {
  fov: 38,
  attract: { target: [0, SURFACE_Y, 0], distance: 3.2, height: 1.9, lensShift: -6 },
  play: { position: [0, SURFACE_Y + 3, 0.01], target: [0, SURFACE_Y, 0] },
  pose: poolPose,
};

export const TABLE_HALF = { x: HALF_L, z: HALF_W } as const;

/** The pendant's height over the cloth. */
export const LAMP_Y = SURFACE_Y + 1.05;
const LAMP_WARM = '#ffd9a0';

/**
 * A dim billiard hall: the pendant over the table is the key light (the one shadow), the hall HDR
 * only lights reflections, and the fog rides out with the attract camera on tall screens.
 */
export const LOOK = {
  background: COLORS.room,
  fog: { color: COLORS.room, near: 4, far: 11, follow: { nearPast: -1.5, farPast: 5 } },
  hemisphere: { sky: '#c9d6ff', ground: '#2a1a12', intensity: 0.35 },
  key: {
    kind: 'spot',
    position: [0, LAMP_Y + 0.6, 0],
    color: '#ffe2b0',
    intensity: 26,
    angle: 0.95,
    penumbra: 0.75,
    distance: 6,
    decay: 1.2,
    shadow: { mapSize: 2048, bias: -0.00012, normalBias: 0.015 },
  },
  fills: [
    {
      kind: 'point',
      position: [-0.75, LAMP_Y, 0],
      color: LAMP_WARM,
      intensity: 1.6,
      distance: 2.4,
      decay: 1.6,
    },
    {
      kind: 'point',
      position: [0.75, LAMP_Y, 0],
      color: LAMP_WARM,
      intensity: 1.6,
      distance: 2.4,
      decay: 1.6,
    },
    { kind: 'directional', position: [-2.5, 2.6, 3], color: '#9fc2ff', intensity: 0.35 },
    { kind: 'directional', position: [3, 3.2, -3.5], color: '#bcd6ff', intensity: 0.45 },
  ],
  environment: { source: 'custom', intensity: 0.35 },
  toneMapping: 'aces',
  exposure: 0.95,
  post: {
    // Above the balls' specular peaks: a glint, not a bulb. The shade (HDR) still blooms.
    bloom: { strength: 0.3, radius: 0.4, threshold: 3 },
    vignette: 0.55,
    saturation: 1.04,
  },
} as const satisfies StadiumLook;
