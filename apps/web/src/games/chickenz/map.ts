/**
 * ARENA layout in pixels, top-left origin (mirrors `crates/chickenz-sim/src/map.rs`). The renderer
 * reads it until the wasm sim exposes map data directly (S07).
 */
export type Rect = { x: number; y: number; w: number; h: number };

export const ARENA = {
  platforms: [
    { x: 0, y: 512, w: 960, h: 32 },
    { x: 128, y: 416, w: 176, h: 16 },
    { x: 672, y: 416, w: 176, h: 16 },
    { x: 352, y: 304, w: 256, h: 16 },
    { x: 64, y: 208, w: 144, h: 16 },
    { x: 752, y: 208, w: 144, h: 16 },
  ],
  weaponSpawns: [
    { x: 192, y: 384 },
    { x: 736, y: 384 },
    { x: 464, y: 272 },
    { x: 464, y: 480 },
  ],
} as const satisfies {
  platforms: readonly Rect[];
  weaponSpawns: readonly { x: number; y: number }[];
};
