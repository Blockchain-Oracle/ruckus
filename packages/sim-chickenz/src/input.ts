/** Button bits; must match `crates/chickenz-sim/src/state.rs` `button`. */
export const Button = {
  Left: 1,
  Right: 2,
  Jump: 4,
  Shoot: 8,
  /** Cosmetic: the sim ignores it, the renderer plays the taunt. */
  Taunt: 16,
} as const;

export type PlayerInput = { buttons: number; aimX: -1 | 0 | 1; aimY: -1 | 0 | 1 };

export const NULL_INPUT: PlayerInput = { buttons: 0, aimX: 0, aimY: 0 };

export const WeaponId = { None: -1, Pistol: 0, Shotgun: 1, Sniper: 2, Rocket: 3, Smg: 4 } as const;

export const MapId = { Arena: 0, Towers: 1, Bridges: 2 } as const;

/** 60 Hz fixed tick; all timing constants in the sim are in these ticks. */
export const TICK_HZ = 60;
/** Positions in the view are fixed point: pixels × 256. */
export const FP_ONE = 256;
export const MAX_PLAYERS = 4;
export const MAX_PROJECTILES = 32;
export const MAX_PICKUPS = 4;
/** Full health (crates/chickenz-sim constants MAX_HEALTH). */
export const MAX_HEALTH_HP = 100;
