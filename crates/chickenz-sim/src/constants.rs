//! Tuning. Units: `px` pixels, `t` ticks at 60 Hz, `Fp` = px × 256. Values are Chickenz's unless
//! marked RUCKUS; per-tick numbers are the original's (`fp.rs:44-85`).

use crate::fixed::{fp, Fp, ONE};

pub const TICK_HZ: i32 = 60;
pub const MAX_PLAYERS: usize = 4;
/// RUCKUS: raised from 24 so four shotguns can fire in one tick.
pub const MAX_PROJECTILES: usize = 32;
pub const MAX_WEAPON_PICKUPS: usize = 4;

// Movement (px/t, px/t²)
pub const GRAVITY_FP_PER_T2: Fp = ONE / 2;
pub const RUN_SPEED_FP_PER_T: Fp = fp(4);
pub const ACCEL_FP_PER_T2: Fp = 205; // 0.8
pub const DECEL_FP_PER_T2: Fp = 154; // 0.6
pub const JUMP_VY_FP_PER_T: Fp = -2688; // -10.5 → ~110 px apex
pub const MAX_FALL_FP_PER_T: Fp = fp(12);
pub const MAX_JUMPS: i32 = 2;
pub const WALL_SLIDE_FP_PER_T: Fp = fp(2);
pub const WALL_JUMP_VX_FP_PER_T: Fp = fp(7);
pub const WALL_JUMP_VY_FP_PER_T: Fp = fp(-10);
/// Width of the band beside a platform edge that counts as a wall for sliding.
pub const WALL_BAND_FP: Fp = fp(2);
/// RUCKUS: a jump pressed this close before landing (with no jumps left) fires on touchdown.
pub const JUMP_BUFFER_T: i32 = 6;

// Body
pub const PLAYER_W_FP: Fp = fp(24);
pub const PLAYER_H_FP: Fp = fp(32);
pub const MAX_HEALTH: i32 = 100;
pub const INITIAL_LIVES: i32 = 1;
pub const DEATH_LINGER_T: i32 = 30;

// Round clock. RUCKUS: longer rounds for bigger lobbies; sudden death always owns the last 10 s.
pub const ROUND_T_BY_PLAYERS: [i32; MAX_PLAYERS + 1] = [0, 0, 30 * TICK_HZ, 35 * TICK_HZ, 40 * TICK_HZ];
pub const SUDDEN_DEATH_LEAD_T: i32 = 10 * TICK_HZ;
/// The damage zone closes from both walls to the centre over this long.
pub const ZONE_CLOSE_T: i32 = 5 * TICK_HZ;
pub const ZONE_BURST_INTERVAL_T: i32 = 10;
/// Burst damage = progress_ticks × interval / (close_ticks × this); ~3 HP per burst when closed.
pub const ZONE_BURST_DIVISOR: i32 = 3;

// Stomp
pub const STOMP_HEAD_WINDOW_FP: Fp = fp(8);
pub const STOMP_DAMAGE_INTERVAL_T: i32 = 2;
pub const STOMP_DAMAGE_PER_HIT: i32 = 1;
pub const STOMP_SHAKE_PER_PRESS: i32 = 17;
pub const STOMP_SHAKE_THRESHOLD: i32 = 100;
pub const STOMP_SHAKE_DECAY_PER_T: i32 = 1;
pub const STOMP_AUTO_RUN_MIN_T: i32 = 20;
pub const STOMP_AUTO_RUN_MAX_T: i32 = 60;
pub const STOMP_IMMUNITY_T: i32 = 90;
/// A single stomp session can take at most half a health bar.
pub const STOMP_MAX_DAMAGE: i32 = MAX_HEALTH / 2;

// Weapons and pickups
pub const PICKUP_RESPAWN_T: i32 = 5 * TICK_HZ;
pub const PICKUP_RADIUS_FP: Fp = fp(16);
/// Projectiles are culled this far outside the map.
pub const PROJECTILE_CULL_MARGIN_FP: Fp = fp(50);
/// Platforms stop bullets slightly above their surface so shots don't visually skim the grass.
pub const PROJECTILE_PLATFORM_BUFFER_FP: Fp = fp(4);
/// 1/√2 for diagonal aim.
pub const DIAGONAL_FP: Fp = 181;
/// Shotgun: per-pellet perpendicular step (~3.5°) and ±jitter, plus a slight upward bias.
pub const SHOTGUN_SPREAD_STEP_FP: Fp = 16;
pub const SHOTGUN_JITTER_FP: i32 = 6;
pub const SHOTGUN_LIFT_FP: Fp = 15;
/// RUCKUS: knockback speed can't exceed a sprint and a half, so hits shove rather than launch.
pub const KNOCKBACK_MAX_FP_PER_T: Fp = RUN_SPEED_FP_PER_T * 3 / 2;
/// RUCKUS: rocket splash also pops the victim upward.
pub const ROCKET_POP_VY_FP_PER_T: Fp = fp(-4);
