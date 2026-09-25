import type { CameraRig } from '@/engine/types.ts';

/** Chickenz maps are 960×540 px on a 16 px grid; one world unit is one 16 px tile. */
export const TILE_PX = 16;
export const MAP_W_PX = 960;
export const MAP_H_PX = 540;
export const MAP_W = MAP_W_PX / TILE_PX;
export const MAP_H = MAP_H_PX / TILE_PX;
const CENTER = [MAP_W / 2, MAP_H / 2, 0] as const;

/** A narrow FOV keeps the pixel arena nearly orthographic in play while still letting it orbit. */
const PLAY_FOV_DEG = 30;
/** Height-locked like Chickenz: 540 px of world always fills the view height. */
const PLAY_DISTANCE = MAP_H / 2 / Math.tan(((PLAY_FOV_DEG / 2) * Math.PI) / 180);

export const rig: CameraRig = {
  fov: PLAY_FOV_DEG,
  attract: { target: CENTER, distance: PLAY_DISTANCE * 0.9, height: MAP_H * 0.2, lensShift: -6 },
  play: { position: [CENTER[0], CENTER[1], PLAY_DISTANCE], target: CENTER },
};

/** Layer depths (world units): the diorama separates when the attract camera orbits. */
export const DEPTH = { background: -1.5, terrain: 0, bird: 0.4 } as const;

/** Background tiles drift slowly in a seeded direction (Chickenz MapBuilder: 0.3 px/frame). */
export const BG_SCROLL_PX_PER_S = 18;
/** Pixel Adventure sheets animate at 20 fps. */
export const SPRITE_FPS = 20;
/** The stone frame sits 4 px outside the arena so its inner edge is flush with the walls. */
export const BORDER_OUTSET_PX = 4;
