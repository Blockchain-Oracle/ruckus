//! Stomp: land on a head to ride it (`fp.rs:1252-1397`), generalised to any pair of players.

use crate::combat::eliminate;
use crate::constants::*;
use crate::fixed::Fp;
use crate::state::{button, Input, State, NOBODY};

/// A falling player whose feet land within the head window of another becomes their rider.
pub fn detect(state: &mut State) {
    let n = state.n();
    for a in 0..n {
        for b in 0..n {
            if a == b {
                continue;
            }
            let (pa, pb) = (state.players[a], state.players[b]);
            // One ride at a time on each side; riders can't be ridden (no stacks); immunity counts.
            if pa.stomping_on >= 0 || pa.stomped_by >= 0 || pb.stomped_by >= 0 || pb.stomping_on >= 0 {
                continue;
            }
            if pb.stomp_cooldown > 0 || !pa.alive() || !pb.alive() || pa.vy <= 0 {
                continue;
            }
            let feet = pa.y + PLAYER_H_FP;
            if feet < pb.y || feet > pb.y + STOMP_HEAD_WINDOW_FP {
                continue;
            }
            if pa.x + PLAYER_W_FP <= pb.x || pa.x >= pb.x + PLAYER_W_FP {
                continue;
            }
            start(state, a, b);
        }
    }
}

fn start(state: &mut State, rider: usize, victim: usize) {
    let victim_y = state.players[victim].y;
    let r = &mut state.players[rider];
    r.stomping_on = victim as i32;
    r.grounded = true;
    r.vy = 0;
    r.y = victim_y - PLAYER_H_FP;

    let dir = if state.rng.range(0, 1) == 0 { -1 } else { 1 };
    let timer = state.rng.range(STOMP_AUTO_RUN_MIN_T, STOMP_AUTO_RUN_MAX_T);
    let v = &mut state.players[victim];
    v.stomped_by = rider as i32;
    v.stomp_shake_progress = 0;
    v.stomp_last_shake_dir = 0;
    v.stomp_auto_run_dir = dir;
    v.stomp_auto_run_timer = timer;
}

fn release(state: &mut State, rider: usize, victim: usize, launch_vy: Fp) {
    let r = &mut state.players[rider];
    r.stomping_on = NOBODY;
    r.vy = launch_vy;
    r.grounded = false;
    let v = &mut state.players[victim];
    v.stomp_cooldown = STOMP_IMMUNITY_T;
    v.clear_stomp();
}

/// Damage, auto-run, shake-off and rider lock for every active ride.
pub fn process(state: &mut State, inputs: &[Input], prev_buttons: &[u8]) {
    let n = state.n();
    let tick = state.tick;
    for victim in 0..n {
        let rider_id = state.players[victim].stomped_by;
        if rider_id < 0 {
            continue;
        }
        let rider = rider_id as usize;
        if !state.players[rider].alive() || state.players[rider].stomping_on != victim as i32 {
            state.players[victim].clear_stomp();
            continue;
        }

        if tick % STOMP_DAMAGE_INTERVAL_T == 0 {
            let v = &mut state.players[victim];
            v.health -= STOMP_DAMAGE_PER_HIT;
            v.stomp_damage_taken += STOMP_DAMAGE_PER_HIT;
            if v.health <= 0 {
                eliminate(state, victim, rider as i32);
                // The rider bounces off the fallen bird.
                state.players[rider].vy = JUMP_VY_FP_PER_T / 2;
                continue;
            }
            if v.stomp_damage_taken >= STOMP_MAX_DAMAGE {
                release(state, rider, victim, JUMP_VY_FP_PER_T);
                continue;
            }
        }

        let redraw = {
            let v = &mut state.players[victim];
            v.stomp_auto_run_timer -= 1;
            v.stomp_auto_run_timer <= 0
        };
        if redraw {
            let timer = state.rng.range(STOMP_AUTO_RUN_MIN_T, STOMP_AUTO_RUN_MAX_T);
            let v = &mut state.players[victim];
            v.stomp_auto_run_dir *= -1;
            v.stomp_auto_run_timer = timer;
        }

        let v = &mut state.players[victim];
        v.vx = RUN_SPEED_FP_PER_T * v.stomp_auto_run_dir;
        // Shake-off counts only *alternating* presses, so mashing one key doesn't work.
        let (now, prev) = (inputs[victim].buttons, prev_buttons[victim]);
        let left_edge = now & button::LEFT != 0 && prev & button::LEFT == 0;
        let right_edge = now & button::RIGHT != 0 && prev & button::RIGHT == 0;
        if left_edge && v.stomp_last_shake_dir != -1 {
            v.stomp_shake_progress += STOMP_SHAKE_PER_PRESS;
            v.stomp_last_shake_dir = -1;
        }
        if right_edge && v.stomp_last_shake_dir != 1 {
            v.stomp_shake_progress += STOMP_SHAKE_PER_PRESS;
            v.stomp_last_shake_dir = 1;
        }
        v.stomp_shake_progress = (v.stomp_shake_progress - STOMP_SHAKE_DECAY_PER_T).max(0);
        if v.stomp_shake_progress >= STOMP_SHAKE_THRESHOLD {
            release(state, rider, victim, JUMP_VY_FP_PER_T);
            continue;
        }

        let (vx, vy) = (state.players[victim].x, state.players[victim].y);
        let r = &mut state.players[rider];
        r.x = vx;
        r.y = vy - PLAYER_H_FP;
        r.vx = 0;
        r.vy = 0;
        r.grounded = true;
    }
}
