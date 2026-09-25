use crate::fixed::{fp, Fp};

pub type Weapon = i8;
pub const NONE: Weapon = -1;
pub const PISTOL: Weapon = 0;
pub const SHOTGUN: Weapon = 1;
pub const SNIPER: Weapon = 2;
pub const ROCKET: Weapon = 3;
pub const SMG: Weapon = 4;
pub const COUNT: usize = 5;

/// Respawned pedestals draw from this list; the initial four take indices 0..4 (so no SMG at start).
pub const ROTATION: [Weapon; COUNT] = [PISTOL, SHOTGUN, SNIPER, ROCKET, SMG];

#[derive(Clone, Copy)]
pub struct Stats {
    pub damage: i32,
    pub speed_fp_per_t: Fp,
    pub cooldown_t: i32,
    pub lifetime_t: i32,
    pub ammo: i32,
    pub pellets: i32,
    pub splash_radius_fp: Fp,
    pub splash_damage: i32,
    /// RUCKUS: horizontal shove on the victim, px/t.
    pub knockback_fp_per_t: Fp,
}

pub const STATS: [Stats; COUNT] = [
    Stats { damage: 20, speed_fp_per_t: fp(8), cooldown_t: 12, lifetime_t: 90, ammo: 15, pellets: 1, splash_radius_fp: 0, splash_damage: 0, knockback_fp_per_t: fp(2) },
    Stats { damage: 12, speed_fp_per_t: fp(7), cooldown_t: 30, lifetime_t: 45, ammo: 6, pellets: 5, splash_radius_fp: 0, splash_damage: 0, knockback_fp_per_t: fp(1) },
    Stats { damage: 80, speed_fp_per_t: fp(16), cooldown_t: 60, lifetime_t: 120, ammo: 3, pellets: 1, splash_radius_fp: 0, splash_damage: 0, knockback_fp_per_t: fp(6) },
    Stats { damage: 50, speed_fp_per_t: fp(7), cooldown_t: 45, lifetime_t: 120, ammo: 4, pellets: 1, splash_radius_fp: fp(40), splash_damage: 25, knockback_fp_per_t: fp(5) },
    Stats { damage: 10, speed_fp_per_t: fp(9), cooldown_t: 5, lifetime_t: 60, ammo: 40, pellets: 1, splash_radius_fp: 0, splash_damage: 0, knockback_fp_per_t: 128 },
];

/// Invalid ids fall back to the pistol rather than panicking inside the fixed-tick loop.
#[inline(always)]
pub fn stats(w: Weapon) -> Stats {
    if w >= 0 && (w as usize) < COUNT {
        STATS[w as usize]
    } else {
        STATS[0]
    }
}
