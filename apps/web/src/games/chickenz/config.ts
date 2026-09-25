import type { CameraRig } from '@/engine/types.ts';

/** Chickenz maps are 960×540 px on a 16 px grid; one world unit is one tile. */
export const TILE_PX = 16;
export const MAP_W = 960 / TILE_PX;
export const MAP_H = 540 / TILE_PX;
const CENTER = [MAP_W / 2, MAP_H / 2, 0] as const;

/** A narrow FOV keeps the pixel diorama nearly orthographic in play while still letting it orbit. */
const PLAY_FOV_DEG = 30;
/** Pull back just far enough that the full map height fills the view, like Chickenz's height lock. */
const PLAY_DISTANCE = MAP_H / 2 / Math.tan(((PLAY_FOV_DEG / 2) * Math.PI) / 180);

export const rig: CameraRig = {
  fov: PLAY_FOV_DEG,
  attract: { target: CENTER, distance: PLAY_DISTANCE * 0.9, height: MAP_H * 0.35, lensShift: -6 },
  play: { position: [CENTER[0], CENTER[1], PLAY_DISTANCE], target: CENTER },
};

/** Placeholder layout (tiles, origin bottom-left) until the real ARENA map lands in S07. */
export const PLACEHOLDER_PLATFORMS = [
  { x: 0, y: 0, w: MAP_W, h: 2 },
  { x: 8, y: 8, w: 12, h: 1 },
  { x: 40, y: 8, w: 12, h: 1 },
  { x: 24, y: 15, w: 12, h: 1 },
  { x: 4, y: 22, w: 10, h: 1 },
  { x: 46, y: 22, w: 10, h: 1 },
] as const;

export const PLAYER_COLORS = ['#ff5a36', '#2ec4b6', '#8c6bff', '#9be15d'] as const;
export const WALL_COLOR = '#2a1838';
export const PLATFORM_TOP = '#9be15d';
export const PLATFORM_BODY = '#7a4a2e';
