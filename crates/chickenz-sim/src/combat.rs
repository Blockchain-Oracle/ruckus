//! Pickups, projectiles, hits and elimination (`fp.rs:806-1147`, generalised to N players).

use crate::constants::*;
use crate::fixed::{mul, Fp, ONE};
use crate::map::Map;
use crate::state::{Player, Projectile, State, NOBODY};
use crate::weapons;

/// Up to one kill per player per tick.
#[derive(Clone, Copy)]
pub struct Kills {
    data: [(i32, i32); MAX_PLAYERS],
    len: usize,
}

impl Kills {
    pub const fn new() -> Self {
        Kills { data: [(NOBODY, NOBODY); MAX_PLAYERS], len: 0 }
    }
    pub fn push(&mut self, killer: i32, victim: i32) {
        if self.len < MAX_PLAYERS {
            self.data[self.len] = (killer, victim);
            self.len += 1;
        }
    }
    pub fn iter(&self) -> impl Iterator<Item = &(i32, i32)> {
        self.data[..self.len].iter()
    }
}

impl Default for Kills {
    fn default() -> Self {
        Self::new()
    }
}

/// Visit player indices starting at a tick-rotating offset, so simultaneous contests (two birds on
/// one pedestal, one bullet overlapping two birds) don't always favour the lowest slot.
#[inline(always)]
pub fn fair_order(tick: i32, n: usize) -> impl Iterator<Item = usize> {
    let start = (tick.rem_euclid(n as i32)) as usize;
    (0..n).map(move |k| (start + k) % n)
}

/// Knock the victim out of the round (health, lives, stomp links, credit). `killer` may be NOBODY
/// (the zone).
pub fn eliminate(state: &mut State, victim: usize, killer: i32) {
    let tick = state.tick;
    let n = state.n();
    let v = &mut state.players[victim];
    v.health = 0;
    v.flags = 0;
    v.lives -= 1;
    v.vx = 0;
    v.vy = 0;
    v.respawn_timer = 0;
    v.died_at = tick;
    v.clear_stomp();
    for i in 0..n {
        if i == victim {
            continue;
        }
        let o = &mut state.players[i];
        if o.stomping_on == victim as i32 {
            o.stomping_on = NOBODY;
            o.grounded = false;
        }
        if o.stomped_by == victim as i32 {
            o.clear_stomp();
        }
    }
    if killer >= 0 && killer != victim as i32 {
        state.score[killer as usize] += 1;
    }
}

#[inline(always)]
fn overlaps_pickup(p: &Player, x: Fp, y: Fp) -> bool {
    x + PICKUP_RADIUS_FP > p.x
        && x - PICKUP_RADIUS_FP < p.x + PLAYER_W_FP
        && y + PICKUP_RADIUS_FP > p.y
        && y - PICKUP_RADIUS_FP < p.y + PLAYER_H_FP
}

pub fn resolve_pickups(state: &mut State) {
    let n = state.n();
    for pi in 0..state.pickup_count as usize {
        if state.pickups[pi].respawn_timer > 0 {
            continue;
        }
        let (x, y, weapon) = (state.pickups[pi].x, state.pickups[pi].y, state.pickups[pi].weapon);
        for i in fair_order(state.tick, n) {
            let p = &mut state.players[i];
            if !p.alive() || !overlaps_pickup(p, x, y) {
                continue;
            }
            p.weapon = weapon;
            p.ammo = weapons::stats(weapon).ammo;
            p.shoot_cooldown = 0;
            state.pickups[pi].respawn_timer = PICKUP_RESPAWN_T;
            break;
        }
    }
}

pub fn tick_pickup_timers(state: &mut State) {
    for pi in 0..state.pickup_count as usize {
        if state.pickups[pi].respawn_timer <= 0 {
            continue;
        }
        state.pickups[pi].respawn_timer -= 1;
        if state.pickups[pi].respawn_timer <= 0 {
            let idx = state.rng.range(0, weapons::COUNT as i32 - 1);
            state.pickups[pi].weapon = weapons::ROTATION[idx as usize];
        }
    }
}

/// Unit aim vector in Fp. Neutral aim fires along facing, or away from the wall when sliding.
fn aim_vector(p: &Player, aim_x: i8, aim_y: i8) -> (Fp, Fp) {
    if aim_x == 0 && aim_y == 0 {
        let dir = if p.wall_sliding { -p.wall_dir } else { p.facing };
        (dir * ONE, 0)
    } else if aim_y == 0 {
        (if aim_x > 0 { ONE } else { -ONE }, 0)
    } else if aim_x == 0 {
        (0, if aim_y > 0 { ONE } else { -ONE })
    } else {
        let d = DIAGONAL_FP;
        (if aim_x > 0 { d } else { -d }, if aim_y > 0 { d } else { -d })
    }
}

fn push_projectile(state: &mut State, proj: Projectile) -> bool {
    if state.proj_count as usize >= MAX_PROJECTILES {
        return false;
    }
    state.projectiles[state.proj_count as usize] = proj;
    state.proj_count += 1;
    state.next_proj_id += 1;
    true
}

pub fn fire(state: &mut State, idx: usize, aim_x: i8, aim_y: i8) {
    let p = state.players[idx];
    let weapon = p.weapon;
    if weapon == weapons::NONE {
        return;
    }
    let s = weapons::stats(weapon);
    let (nx, ny) = aim_vector(&p, aim_x, aim_y);
    let sx = p.x + PLAYER_W_FP / 2 + mul(nx, PLAYER_W_FP / 2);
    let sy = p.y + PLAYER_H_FP / 2 + mul(ny, PLAYER_H_FP / 2);

    if s.pellets == 1 {
        let proj = Projectile {
            id: state.next_proj_id,
            owner: idx as i32,
            x: sx,
            y: sy,
            vx: mul(nx, s.speed_fp_per_t),
            vy: mul(ny, s.speed_fp_per_t),
            lifetime: s.lifetime_t,
            weapon,
        };
        push_projectile(state, proj);
        return;
    }

    // Shotgun: pellets fan out perpendicular to aim, with seeded jitter and a slight lift.
    let (perp_x, perp_y) = (-ny, nx);
    for i in 0..s.pellets {
        let offset = i - s.pellets / 2;
        let jitter = state.rng.range(-SHOTGUN_JITTER_FP, SHOTGUN_JITTER_FP);
        let spread = mul(offset * SHOTGUN_SPREAD_STEP_FP + jitter, s.speed_fp_per_t);
        let proj = Projectile {
            id: state.next_proj_id,
            owner: idx as i32,
            x: sx,
            y: sy,
            vx: mul(nx, s.speed_fp_per_t) + mul(perp_x, spread),
            vy: mul(ny, s.speed_fp_per_t) + mul(perp_y, spread) - mul(SHOTGUN_LIFT_FP, s.speed_fp_per_t),
            lifetime: s.lifetime_t,
            weapon,
        };
        if !push_projectile(state, proj) {
            break;
        }
    }
}

fn out_of_bounds(p: &Projectile, map: &Map) -> bool {
    let m = PROJECTILE_CULL_MARGIN_FP;
    p.x < -m || p.x > map.width + m || p.y < -m || p.y > map.height + m
}

/// Platforms, map walls, ceiling and floor stop bullets; the zone does not.
fn hits_solid(p: &Projectile, map: &Map) -> bool {
    let buf = PROJECTILE_PLATFORM_BUFFER_FP;
    for plat in map.platforms.iter().filter(|pl| !pl.is_empty()) {
        if p.x >= plat.x && p.x <= plat.x + plat.w && p.y >= plat.y - buf && p.y <= plat.y + plat.h {
            return true;
        }
    }
    p.x <= 0 || p.x >= map.width || p.y <= 0 || p.y >= map.height
}

fn knock(p: &mut Player, dir: i32, speed: Fp, pop: Fp) {
    if p.stomped_by >= 0 || p.stomping_on >= 0 {
        return;
    }
    p.vx = (p.vx + dir * speed).clamp(-KNOCKBACK_MAX_FP_PER_T, KNOCKBACK_MAX_FP_PER_T);
    if pop != 0 {
        p.vy = p.vy.min(pop);
        p.grounded = false;
    }
}

fn damage(state: &mut State, victim: usize, amount: i32, killer: i32, kills: &mut Kills) {
    let p = &mut state.players[victim];
    p.health -= amount;
    if p.health <= 0 {
        // Mark dead now so later bullets this tick pass through; bookkeeping happens in `settle`.
        p.health = 0;
        p.flags = 0;
        kills.push(killer, victim as i32);
    }
}

/// Rocket splash: Manhattan radius, linear falloff, no self-damage, skips the direct-hit victim.
fn splash(state: &mut State, ex: Fp, ey: Fp, owner: i32, skip: i32, kills: &mut Kills) {
    let s = weapons::stats(weapons::ROCKET);
    for i in fair_order(state.tick, state.n()) {
        let p = state.players[i];
        if !p.alive() || p.invincible() || i as i32 == owner || i as i32 == skip {
            continue;
        }
        let cx = p.x + PLAYER_W_FP / 2;
        let cy = p.y + PLAYER_H_FP / 2;
        let dist = (cx - ex).abs() + (cy - ey).abs();
        if dist >= s.splash_radius_fp {
            continue;
        }
        let dmg = s.splash_damage - (s.splash_damage as i64 * dist as i64 / s.splash_radius_fp as i64) as i32;
        if dmg <= 0 {
            continue;
        }
        let dir = if cx >= ex { 1 } else { -1 };
        knock(&mut state.players[i], dir, s.knockback_fp_per_t, ROCKET_POP_VY_FP_PER_T);
        damage(state, i, dmg, owner, kills);
    }
}

/// Advance projectiles; anything that expires, leaves, or hits a solid is removed (rockets burst).
pub fn move_projectiles(state: &mut State, map: &Map, kills: &mut Kills) {
    let mut write = 0usize;
    for read in 0..state.proj_count as usize {
        let mut pr = state.projectiles[read];
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.lifetime -= 1;
        if pr.lifetime <= 0 || out_of_bounds(&pr, map) || hits_solid(&pr, map) {
            if pr.weapon == weapons::ROCKET {
                splash(state, pr.x, pr.y, pr.owner, NOBODY, kills);
            }
            continue;
        }
        state.projectiles[write] = pr;
        write += 1;
    }
    state.proj_count = write as u8;
}

#[inline(always)]
fn point_in_body(x: Fp, y: Fp, p: &Player) -> bool {
    x >= p.x && x <= p.x + PLAYER_W_FP && y >= p.y && y <= p.y + PLAYER_H_FP
}

pub fn resolve_hits(state: &mut State, kills: &mut Kills) {
    let mut consumed = [false; MAX_PROJECTILES];
    for pi in 0..state.proj_count as usize {
        let pr = state.projectiles[pi];
        for i in fair_order(state.tick, state.n()) {
            let p = state.players[i];
            if i as i32 == pr.owner || !p.alive() || p.invincible() || !point_in_body(pr.x, pr.y, &p) {
                continue;
            }
            consumed[pi] = true;
            let s = weapons::stats(pr.weapon);
            let dir = if pr.vx > 0 {
                1
            } else if pr.vx < 0 {
                -1
            } else if p.x + PLAYER_W_FP / 2 >= pr.x {
                1
            } else {
                -1
            };
            knock(&mut state.players[i], dir, s.knockback_fp_per_t, 0);
            damage(state, i, s.damage, pr.owner, kills);
            if pr.weapon == weapons::ROCKET {
                splash(state, pr.x, pr.y, pr.owner, i as i32, kills);
            }
            break;
        }
    }
    let mut write = 0usize;
    for read in 0..state.proj_count as usize {
        if !consumed[read] {
            state.projectiles[write] = state.projectiles[read];
            write += 1;
        }
    }
    state.proj_count = write as u8;
}

/// Apply lives/links/credit for everyone marked dead this phase.
pub fn settle(state: &mut State, kills: &Kills) {
    for &(killer, victim) in kills.iter() {
        eliminate(state, victim as usize, killer);
    }
}

