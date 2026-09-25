//! Flat i32 render view: the renderer reads one typed array per frame instead of objects. Order is
//! the contract with `packages/sim-chickenz/src/view.ts`; bump VIEW_VERSION on any change.

use crate::constants::{MAX_PLAYERS, MAX_PROJECTILES, MAX_WEAPON_PICKUPS};
use crate::state::State;

pub const VIEW_VERSION: i32 = 1;
pub const HEADER: usize = 10;
pub const PLAYER_STRIDE: usize = 20;
pub const PROJECTILE_STRIDE: usize = 7;
pub const PICKUP_STRIDE: usize = 4;
pub const LEN: usize = HEADER + MAX_PLAYERS * PLAYER_STRIDE + MAX_PROJECTILES * PROJECTILE_STRIDE + MAX_WEAPON_PICKUPS * PICKUP_STRIDE;

/// Positions and velocities stay in Fp (px × 256) so the renderer can interpolate sub-pixel.
pub fn write(s: &State, out: &mut [i32]) {
    if out.len() < LEN {
        return;
    }
    let header = [
        VIEW_VERSION,
        s.tick,
        s.match_over as i32,
        s.winner,
        s.death_linger_timer,
        s.zone_left,
        s.zone_right,
        s.cfg.player_count as i32,
        s.proj_count as i32,
        s.pickup_count as i32,
    ];
    out[..HEADER].copy_from_slice(&header);
    let mut at = HEADER;
    for (i, p) in s.players.iter().enumerate() {
        let row = [
            p.x,
            p.y,
            p.vx,
            p.vy,
            p.facing,
            p.health,
            p.lives,
            p.flags as i32,
            p.weapon as i32,
            p.ammo,
            p.grounded as i32,
            p.wall_sliding as i32,
            p.stomped_by,
            p.stomping_on,
            p.stomp_shake_progress,
            p.jumps_left,
            p.died_at,
            s.score[i] as i32,
            s.prev_buttons[i] as i32,
            p.shoot_cooldown,
        ];
        out[at..at + PLAYER_STRIDE].copy_from_slice(&row);
        at += PLAYER_STRIDE;
    }
    for i in 0..MAX_PROJECTILES {
        let pr = &s.projectiles[i];
        let row = [pr.id, pr.owner, pr.x, pr.y, pr.vx, pr.vy, pr.weapon as i32];
        out[at..at + PROJECTILE_STRIDE].copy_from_slice(&row);
        at += PROJECTILE_STRIDE;
    }
    for pk in s.pickups.iter() {
        out[at..at + PICKUP_STRIDE].copy_from_slice(&[pk.x, pk.y, pk.weapon as i32, pk.respawn_timer]);
        at += PICKUP_STRIDE;
    }
}
