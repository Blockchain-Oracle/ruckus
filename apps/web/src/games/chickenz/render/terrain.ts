import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three/webgpu';

import { BORDER_OUTSET_PX, MAP_H_PX, MAP_W_PX, TILE_PX } from '../config.ts';
import type { ARENA } from '../map.ts';

/** Pixel Adventure terrain sheet: 22 tiles per row (Chickenz `scenes/constants.ts`). */
const COLS = 22;
const THIN_PLATFORM = { col: 12, row: 0 };
const GRASS = { col: 6, row: 0 };
const PEDESTAL = [17, 18, 19] as const;
/** Pedestal art occupies the top ~3 px of its tile, so the tile is nudged to rest on the surface. */
const PEDESTAL_SURFACE_OFFSET_PX = 5;
const BORDER = {
  topLeft: 3,
  top: 2 * COLS + 1,
  topRight: 4,
  left: COLS + 2,
  right: COLS,
  bottomLeft: COLS + 3,
  bottom: 1,
  bottomRight: COLS + 4,
} as const;

/** The baked texture includes a one-tile margin so the stone frame fits around the arena. */
export const MARGIN_PX = TILE_PX;
export const BAKED_W_PX = MAP_W_PX + 2 * MARGIN_PX;
export const BAKED_H_PX = MAP_H_PX + 2 * MARGIN_PX;

function frameFor(tx: number, ty: number, tilesW: number, tilesH: number) {
  const cx = tx === 0 ? 0 : tx === tilesW - 1 ? 2 : 1;
  if (tilesH === 1) return THIN_PLATFORM.row * COLS + THIN_PLATFORM.col + cx;
  const cy = ty === 0 ? 0 : ty === tilesH - 1 ? 2 : 1;
  return (GRASS.row + cy) * COLS + GRASS.col + cx;
}

/**
 * Platforms, pedestals and the stone frame never move, so they are drawn once into one canvas
 * (one draw call, pixel-exact), exactly the tiling Chickenz's MapBuilder does per sprite.
 */
export function bakeArena(sheet: HTMLImageElement, map: typeof ARENA): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = BAKED_W_PX;
  canvas.height = BAKED_H_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;

  const tile = (frame: number, left: number, top: number) => {
    const sx = (frame % COLS) * TILE_PX;
    const sy = Math.floor(frame / COLS) * TILE_PX;
    ctx.drawImage(
      sheet,
      sx,
      sy,
      TILE_PX,
      TILE_PX,
      left + MARGIN_PX,
      top + MARGIN_PX,
      TILE_PX,
      TILE_PX,
    );
  };
  const tileAtCentre = (frame: number, cx: number, cy: number) =>
    tile(frame, cx - TILE_PX / 2, cy - TILE_PX / 2);

  for (const p of map.platforms) {
    const tilesW = Math.max(1, Math.round(p.w / TILE_PX));
    const tilesH = Math.max(1, Math.round(p.h / TILE_PX));
    for (let ty = 0; ty < tilesH; ty++) {
      for (let tx = 0; tx < tilesW; tx++)
        tile(frameFor(tx, ty, tilesW, tilesH), p.x + tx * TILE_PX, p.y + ty * TILE_PX);
    }
  }

  for (const sp of map.weaponSpawns) {
    let top = MAP_H_PX;
    for (const p of map.platforms)
      if (p.y > sp.y && p.y < top && sp.x >= p.x && sp.x <= p.x + p.w) top = p.y;
    PEDESTAL.forEach((frame, i) => {
      tileAtCentre(frame, sp.x + (i - 1) * TILE_PX, top + PEDESTAL_SURFACE_OFFSET_PX);
    });
  }

  const o = -BORDER_OUTSET_PX;
  const tilesX = Math.ceil(MAP_W_PX / TILE_PX);
  const tilesY = Math.ceil(MAP_H_PX / TILE_PX);
  const half = TILE_PX / 2;
  for (let ty = 0; ty < tilesY; ty++) {
    tileAtCentre(BORDER.left, o, ty * TILE_PX + half);
    tileAtCentre(BORDER.right, MAP_W_PX - o, ty * TILE_PX + half);
  }
  for (let tx = 0; tx < tilesX; tx++) {
    tileAtCentre(BORDER.top, tx * TILE_PX + half, o);
    tileAtCentre(BORDER.bottom, tx * TILE_PX + half, MAP_H_PX - o);
  }
  tileAtCentre(BORDER.topLeft, o, o);
  tileAtCentre(BORDER.topRight, MAP_W_PX - o, o);
  tileAtCentre(BORDER.bottomLeft, o, MAP_H_PX - o);
  tileAtCentre(BORDER.bottomRight, MAP_W_PX - o, MAP_H_PX - o);

  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
