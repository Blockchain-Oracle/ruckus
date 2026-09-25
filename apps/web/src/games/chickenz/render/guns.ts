import type { PixelArt } from './pixelArt.ts';

/** Outline, steel highlight, steel body, wood, warning red. Gold stays reserved for money. */
const PALETTE = {
  X: '#211f30',
  H: '#aab0c8',
  B: '#5b607a',
  D: '#3b3f55',
  W: '#9a6333',
  R: '#ff5a36',
} as const;

/** Index = sim weapon id (pistol, shotgun, sniper, rocket, smg). Muzzle faces right. */
export const GUN_ART: readonly PixelArt[] = [
  {
    palette: PALETTE,
    rows: [
      '.XXXXXXXXXX.',
      'XHHHHHHHHHHX',
      'XBBBBBBBBBBX',
      'XDDDXXXXXXX.',
      'XDDDX.......',
      'XDDDX.......',
      '.XXX........',
    ],
  },
  {
    palette: PALETTE,
    rows: [
      'XXXXX.................',
      'XWWWWXXXXXXXXXXXXXXXXX',
      'XWWWWBHHHHHHHHHHHHHHHX',
      'XWWWWBBBBBBBBBBBBBBBBX',
      '.XXXXXWWWWWWWXXXXXXXX.',
      '......XXXXXXXX........',
    ],
  },
  {
    palette: PALETTE,
    rows: [
      '.........XXXXXX.............',
      '........XHHHHHHX............',
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'XWWWWWBBBBBBBBBBBBBBBBBBBBBX',
      'XWWWWXXDDXXXXXXXXXXXXXXXXXX.',
      'XWWWX.XDDX..................',
      'XXXX..XXXX..................',
    ],
  },
  {
    palette: PALETTE,
    rows: [
      '....XXXXXXXXXXXXXXXXXX..',
      '...XHHHHHHHHHHHHHHHHHHXX',
      'XXXXBBBBBBBBBBBBBBBBBBXRX',
      'XDDDBBBBBBBBBBBBBBBBBBXRX',
      'XXXXDDDDDDDDDDDDDDDDDDXX.',
      '...XXXXDDXXXXXXXXXXXXX..',
      '......XDDX..............',
      '......XXXX..............',
    ],
  },
  {
    palette: PALETTE,
    rows: [
      '.XXXXXXXXXXXX.',
      'XHHHHHHHHHHHHX',
      'XBBBBBBBBBBBBX',
      '.XDDXXXDDXXXX.',
      '.XDDX.XDDX....',
      '.XDDX.XDDX....',
      '.XXXX.XXXX....',
    ],
  },
];

/**
 * Where the gun sits relative to the bird's centre (px, +y down), from Chickenz's GUN_CONFIG with
 * its 0.5× scale folded in.
 */
export const GUN_HOLD = [
  { dx: 14, dy: 6.5 },
  { dx: 6, dy: 8 },
  { dx: 9, dy: 7 },
  { dx: 7, dy: 6 },
  { dx: 11.5, dy: 6.5 },
] as const;

/** Bullet size in px (Chickenz ProjectileRenderer: 3×2 up to 6×4), with outline. */
export const BULLET_PX = [
  { w: 3, h: 2 },
  { w: 4, h: 2 },
  { w: 6, h: 2 },
  { w: 6, h: 4 },
  { w: 3, h: 2 },
] as const;
