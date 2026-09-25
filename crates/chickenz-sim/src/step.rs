//! One fixed tick (`fp.rs:1164-1603`), reorganised into phases and generalised to FFA.

use crate::combat::{self, Kills};
use crate::constants::*;
use crate::fixed::{mul, ONE};
use crate::map::Map;
use crate::physics;
use crate::state::{button, Input, State, NOBODY};
use crate::stomp;
use crate::weapons;

pub fn step(state: &mut State, inputs: &[Input; MAX_PLAYERS], map: &Map) {
    let n = state.n();

    // After the round (and during the death linger) survivors can still run about and taunt.
    if state.match_over || state.death_linger_timer > 0 {
        state.tick += 1;
        if state.death_linger_timer > 0 {
            state.death_linger_timer -= 1;
            if state.death_linger_timer == 0 {
                end_round(state);
            }
        }
        move_players(state, inputs, map);
        remember_buttons(state, inputs);
        return;
    }

    state.tick += 1;
    let mut in_at_start = [false; MAX_PLAYERS];
    for i in 0..n {
        in_at_start[i] = state.players[i].lives > 0;
    }

    tick_timers(state);
    move_players(state, inputs, map);
    stomp::detect(state);
    let prev = state.prev_buttons;
    stomp::process(state, inputs, &prev);
    combat::resolve_pickups(state);
    shoot(state, inputs);

    let mut kills = Kills::new();
    combat::move_projectiles(state, map, &mut kills);
    combat::resolve_hits(state, &mut kills);
    combat::settle(state, &kills);
    check_elimination(state, &in_at_start);

    sudden_death(state, map, &in_at_start);
    time_up(state);

    combat::tick_pickup_timers(state);
    remember_buttons(state, inputs);
}

fn move_players(state: &mut State, inputs: &[Input; MAX_PLAYERS], map: &Map) {
    let prev = state.prev_buttons;
    for i in 0..state.n() {
        let p = &mut state.players[i];
        physics::apply_input(p, inputs[i].buttons, prev[i], inputs[i].aim_x);
        physics::apply_gravity(p);
        physics::move_and_collide(p, inputs[i].buttons, map);
    }
}

fn remember_buttons(state: &mut State, inputs: &[Input; MAX_PLAYERS]) {
    for i in 0..MAX_PLAYERS {
        state.prev_buttons[i] = inputs[i].buttons;
    }
}

fn tick_timers(state: &mut State) {
    for i in 0..state.n() {
        let p = &mut state.players[i];
        if !p.alive() {
            continue;
        }
        p.shoot_cooldown = (p.shoot_cooldown - 1).max(0);
        if p.invincible() {
            p.respawn_timer -= 1;
            if p.respawn_timer <= 0 {
                p.flags &= !crate::state::flag::INVINCIBLE;
                p.respawn_timer = 0;
            }
        }
        if p.stomp_cooldown > 0 && p.stomped_by < 0 {
            p.stomp_cooldown -= 1;
        }
    }
}

fn shoot(state: &mut State, inputs: &[Input; MAX_PLAYERS]) {
    for i in 0..state.n() {
        let p = state.players[i];
        if !p.alive()
            || inputs[i].buttons & button::SHOOT == 0
            || p.shoot_cooldown > 0
            || p.weapon == weapons::NONE
            || p.ammo <= 0
        {
            continue;
        }
        // Sliding down a wall, the gun always points away from it.
        let aim_x = if p.wall_sliding { -p.wall_dir as i8 } else { inputs[i].aim_x };
        state.players[i].shoot_cooldown = weapons::stats(p.weapon).cooldown_t;
        combat::fire(state, i, aim_x, inputs[i].aim_y);
        let p = &mut state.players[i];
        p.ammo -= 1;
        if p.ammo <= 0 {
            p.weapon = weapons::NONE;
        }
    }
}

fn end_round(state: &mut State) {
    state.match_over = true;
    state.proj_count = 0;
    state.pickup_count = 0;
    for p in state.players.iter_mut() {
        p.weapon = weapons::NONE;
        p.ammo = 0;
    }
}

/// Pick among `candidates` by descending `key`; exact ties are settled by a seeded draw, so no
/// slot (and no room creator) ever gets an edge.
fn rank<const K: usize>(state: &mut State, candidates: &[bool; MAX_PLAYERS], key: impl Fn(&State, usize) -> [i64; K]) -> i32 {
    let mut best: Option<[i64; K]> = None;
    let mut tied = [0usize; MAX_PLAYERS];
    let mut count = 0usize;
    for i in 0..state.n() {
        if !candidates[i] {
            continue;
        }
        let k = key(state, i);
        match best {
            Some(b) if k < b => {}
            Some(b) if k == b => {
                tied[count] = i;
                count += 1;
            }
            _ => {
                best = Some(k);
                tied[0] = i;
                count = 1;
            }
        }
    }
    match count {
        0 => NOBODY,
        1 => tied[0] as i32,
        _ => tied[state.rng.range(0, count as i32 - 1) as usize] as i32,
    }
}

fn check_elimination(state: &mut State, in_at_start: &[bool; MAX_PLAYERS]) {
    if state.death_linger_timer > 0 {
        return;
    }
    let mut remaining = [false; MAX_PLAYERS];
    let mut count = 0;
    for i in 0..state.n() {
        if state.players[i].lives > 0 {
            remaining[i] = true;
            count += 1;
        }
    }
    let winner = match count {
        1 => rank(state, &remaining, |_, _| [0i64]),
        // Everyone left went down on the same tick: most kills, then a seeded draw.
        0 => rank(state, in_at_start, |s, i| [s.score[i] as i64]),
        _ => return,
    };
    state.winner = winner;
    state.death_linger_timer = DEATH_LINGER_T;
}

/// A damage zone closes from both walls; bullets pass through it.
fn sudden_death(state: &mut State, map: &Map, in_at_start: &[bool; MAX_PLAYERS]) {
    if state.death_linger_timer > 0 || state.tick < state.cfg.sudden_death_tick {
        return;
    }
    let elapsed = state.tick - state.cfg.sudden_death_tick;
    let progress = if elapsed >= ZONE_CLOSE_T { ONE } else { elapsed * ONE / ZONE_CLOSE_T };
    let half = map.width / 2;
    state.zone_left = mul(progress, half);
    state.zone_right = map.width - mul(progress, half);

    let closing = elapsed.min(ZONE_CLOSE_T);
    if closing == 0 || elapsed % ZONE_BURST_INTERVAL_T != 0 {
        return;
    }
    let burst = (closing * ZONE_BURST_INTERVAL_T / (ZONE_CLOSE_T * ZONE_BURST_DIVISOR)).max(1);
    for i in 0..state.n() {
        let p = &mut state.players[i];
        if !p.alive() {
            continue;
        }
        let cx = p.x + PLAYER_W_FP / 2;
        if cx < state.zone_left || cx > state.zone_right {
            p.health -= burst;
            if p.health <= 0 {
                combat::eliminate(state, i, NOBODY);
            }
        }
    }
    check_elimination(state, in_at_start);
}

fn time_up(state: &mut State) {
    if state.match_over || state.death_linger_timer > 0 || state.tick < state.cfg.round_ticks {
        return;
    }
    let mut remaining = [false; MAX_PLAYERS];
    for i in 0..state.n() {
        remaining[i] = state.players[i].lives > 0;
    }
    state.winner = rank(state, &remaining, |s, i| {
        let p = &s.players[i];
        [p.lives as i64, p.health as i64, s.score[i] as i64]
    });
    end_round(state);
}
