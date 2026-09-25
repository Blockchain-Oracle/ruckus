//! Movement, gravity and collision; logic is Chickenz's (`fp.rs:611-804`) plus the jump buffer.

use crate::constants::*;
use crate::map::Map;
use crate::state::{button, Player, FACING_LEFT, FACING_RIGHT};

/// Riders and stomp victims are driven by the stomp system, not by their own input.
#[inline(always)]
fn locked(p: &Player) -> bool {
    p.stomped_by >= 0 || p.stomping_on >= 0
}

pub fn apply_input(p: &mut Player, buttons: u8, prev_buttons: u8, aim_x: i8) {
    if !p.alive() || locked(p) {
        return;
    }

    let mut target_vx = 0;
    if buttons & button::LEFT != 0 {
        target_vx -= RUN_SPEED_FP_PER_T;
    }
    if buttons & button::RIGHT != 0 {
        target_vx += RUN_SPEED_FP_PER_T;
    }
    if target_vx != 0 {
        if p.vx < target_vx {
            p.vx = (p.vx + ACCEL_FP_PER_T2).min(target_vx);
        } else if p.vx > target_vx {
            p.vx = (p.vx - ACCEL_FP_PER_T2).max(target_vx);
        }
    } else if p.vx > 0 {
        p.vx = (p.vx - DECEL_FP_PER_T2).max(0);
    } else if p.vx < 0 {
        p.vx = (p.vx + DECEL_FP_PER_T2).min(0);
    }

    let jump_edge = buttons & button::JUMP != 0 && prev_buttons & button::JUMP == 0;
    if jump_edge {
        p.jump_buffer = JUMP_BUFFER_T;
    }
    if p.jump_buffer > 0 {
        if p.wall_sliding && p.jumps_left > 0 {
            p.vx = WALL_JUMP_VX_FP_PER_T * -p.wall_dir;
            p.vy = WALL_JUMP_VY_FP_PER_T;
            p.jumps_left -= 1;
            p.wall_sliding = false;
            p.wall_dir = 0;
            p.jump_buffer = 0;
        } else if p.jumps_left > 0 {
            p.vy = JUMP_VY_FP_PER_T;
            p.jumps_left -= 1;
            p.jump_buffer = 0;
        } else {
            // No jumps left: keep the press alive for a few ticks so it fires on landing.
            p.jump_buffer -= 1;
        }
    }

    if aim_x > 0 {
        p.facing = FACING_RIGHT;
    } else if aim_x < 0 {
        p.facing = FACING_LEFT;
    }
}

pub fn apply_gravity(p: &mut Player) {
    if !p.alive() || p.stomping_on >= 0 {
        return;
    }
    let max_fall = if p.wall_sliding { WALL_SLIDE_FP_PER_T } else { MAX_FALL_FP_PER_T };
    p.vy = (p.vy + GRAVITY_FP_PER_T2).min(max_fall);
}

/// Move by full velocity then push out along the minimum-penetration axis. 12 px/t max fall
/// against 16 px platforms means no tunnelling, so no sweep is needed.
pub fn move_and_collide(p: &mut Player, buttons: u8, map: &Map) {
    if !p.alive() || p.stomping_on >= 0 {
        return;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.grounded = false;

    for plat in map.platforms.iter().filter(|pl| !pl.is_empty()) {
        if p.x + PLAYER_W_FP > plat.x
            && p.x < plat.x + plat.w
            && p.y + PLAYER_H_FP > plat.y
            && p.y < plat.y + plat.h
        {
            let left = (p.x + PLAYER_W_FP) - plat.x;
            let right = (plat.x + plat.w) - p.x;
            let top = (p.y + PLAYER_H_FP) - plat.y;
            let bottom = (plat.y + plat.h) - p.y;
            let min = left.min(right).min(top).min(bottom);
            if min == top {
                p.y = plat.y - PLAYER_H_FP;
                p.vy = 0;
                p.grounded = true;
            } else if min == bottom {
                p.y = plat.y + plat.h;
                p.vy = 0;
            } else if min == left {
                p.x = plat.x - PLAYER_W_FP;
                p.vx = 0;
            } else {
                p.x = plat.x + plat.w;
                p.vx = 0;
            }
        }
    }

    // Map bounds are physical; the sudden-death zone is damage only.
    if p.x < 0 {
        p.x = 0;
    }
    if p.x + PLAYER_W_FP > map.width {
        p.x = map.width - PLAYER_W_FP;
    }
    if p.y < 0 {
        p.y = 0;
        p.vy = 0;
    }
    if p.y + PLAYER_H_FP > map.height {
        p.y = map.height - PLAYER_H_FP;
        p.vy = 0;
        p.grounded = true;
    }

    let pressing_left = buttons & button::LEFT != 0;
    let pressing_right = buttons & button::RIGHT != 0;
    p.wall_sliding = false;
    p.wall_dir = 0;
    if !p.grounded && p.vy > 0 {
        if p.x <= 0 && pressing_left {
            p.wall_sliding = true;
            p.wall_dir = -1;
        } else if p.x + PLAYER_W_FP >= map.width && pressing_right {
            p.wall_sliding = true;
            p.wall_dir = 1;
        }
        if !p.wall_sliding {
            for plat in map.platforms.iter() {
                if p.y + PLAYER_H_FP > plat.y && p.y < plat.y + plat.h {
                    if pressing_right && p.x + PLAYER_W_FP >= plat.x && p.x + PLAYER_W_FP <= plat.x + WALL_BAND_FP {
                        p.wall_sliding = true;
                        p.wall_dir = 1;
                        break;
                    }
                    if pressing_left && p.x <= plat.x + plat.w && p.x >= plat.x + plat.w - WALL_BAND_FP {
                        p.wall_sliding = true;
                        p.wall_dir = -1;
                        break;
                    }
                }
            }
        }
    }
    if p.wall_sliding {
        p.facing = p.wall_dir;
        p.vx = 0;
    }
    if p.grounded {
        p.jumps_left = MAX_JUMPS;
    } else if p.wall_sliding && p.jumps_left == 0 {
        p.jumps_left = 1;
    }
}
