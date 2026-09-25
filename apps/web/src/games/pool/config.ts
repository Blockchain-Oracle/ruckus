import { HALF_L, HALF_W } from '@arena/sim-pool';

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
