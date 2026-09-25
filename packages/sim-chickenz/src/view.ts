import { MAX_PICKUPS, MAX_PLAYERS, MAX_PROJECTILES } from './input.ts';

/**
 * Decoder for the flat i32 render view (`crates/chickenz-sim/src/view.rs`). `assertLayout` checks
 * these offsets against the wasm's own layout at load, so a mismatch fails loudly, not visually.
 */
export const VIEW_VERSION = 1;
export const HEADER = 10;
export const PLAYER_STRIDE = 20;
export const PROJECTILE_STRIDE = 7;
export const PICKUP_STRIDE = 4;
export const VIEW_LEN =
  HEADER +
  MAX_PLAYERS * PLAYER_STRIDE +
  MAX_PROJECTILES * PROJECTILE_STRIDE +
  MAX_PICKUPS * PICKUP_STRIDE;

export const H = {
  version: 0,
  tick: 1,
  matchOver: 2,
  winner: 3,
  deathLinger: 4,
  zoneLeft: 5,
  zoneRight: 6,
  playerCount: 7,
  projCount: 8,
  pickupCount: 9,
} as const;

export const P = {
  x: 0,
  y: 1,
  vx: 2,
  vy: 3,
  facing: 4,
  health: 5,
  lives: 6,
  flags: 7,
  weapon: 8,
  ammo: 9,
  grounded: 10,
  wallSliding: 11,
  stompedBy: 12,
  stompingOn: 13,
  shakeProgress: 14,
  jumpsLeft: 15,
  diedAt: 16,
  kills: 17,
  buttons: 18,
  shootCooldown: 19,
} as const;

export const PR = { id: 0, owner: 1, x: 2, y: 3, vx: 4, vy: 5, weapon: 6 } as const;
export const PK = { x: 0, y: 1, weapon: 2, respawnTimer: 3 } as const;

export const playerBase = (slot: number) => HEADER + slot * PLAYER_STRIDE;
export const projectileBase = (i: number) =>
  HEADER + MAX_PLAYERS * PLAYER_STRIDE + i * PROJECTILE_STRIDE;
export const pickupBase = (i: number) =>
  HEADER + MAX_PLAYERS * PLAYER_STRIDE + MAX_PROJECTILES * PROJECTILE_STRIDE + i * PICKUP_STRIDE;

export const ALIVE_FLAG = 1;

export function assertLayout(layout: ArrayLike<number>) {
  const expected = [
    VIEW_VERSION,
    HEADER,
    PLAYER_STRIDE,
    PROJECTILE_STRIDE,
    PICKUP_STRIDE,
    VIEW_LEN,
  ];
  for (let i = 0; i < expected.length; i++) {
    if (layout[i] !== expected[i]) {
      throw new Error(
        `chickenz view layout mismatch at ${i}: wasm ${layout[i]} vs ts ${expected[i]}`,
      );
    }
  }
}
