//! Tutorial scaffolding (Chickenz `tutorial/Tutorial.ts`): a two-player sandbox with no clock and
//! lives to spare, where the lesson script parks the dummy bird off-stage or stages a scenario.
//! Only the tutorial calls these; matches and seed banks never do.

use crate::constants::{MAX_HEALTH, PLAYER_H_FP, STOMP_AUTO_RUN_MIN_T};
use crate::fixed::fp;
use crate::map::TUTORIAL;
use crate::state::{flag, Config, State, NOBODY};

pub const TUTORIAL_LIVES: i32 = 99;
/// Far beyond any lesson: the tutorial never times out or triggers sudden death.
const NO_CLOCK_T: i32 = i32::MAX / 4;
/// The dummy reappears this far in front of the student for the final lesson.
const KILL_OFFSET_PX: i32 = 120;
const KILL_TARGET_HP: i32 = 15;
const NEVER_STOMPABLE_T: i32 = 99_999;

pub fn config() -> Config {
    Config { player_count: 2, map: TUTORIAL, initial_lives: TUTORIAL_LIVES, round_ticks: NO_CLOCK_T, sudden_death_tick: NO_CLOCK_T }
}

/// Take a bird out of play without ending anything (it keeps its lives).
pub fn banish(s: &mut State, slot: usize) {
    let p = &mut s.players[slot];
    p.flags = 0;
    p.vx = 0;
    p.vy = 0;
    p.clear_stomp();
    p.x = -fp(9999);
    p.y = -fp(9999);
}

/// `rider` lands on `victim`'s head with the ride already running (lesson: shake them off).
pub fn stage_stomp(s: &mut State, victim: usize, rider: usize) {
    let (vx, vy) = (s.players[victim].x, s.players[victim].y);
    let v = &mut s.players[victim];
    v.health = MAX_HEALTH;
    v.stomp_damage_taken = 0;
    v.stomped_by = rider as i32;
    v.stomping_on = NOBODY;
    v.stomp_shake_progress = 0;
    v.stomp_cooldown = 0;
    v.stomp_last_shake_dir = 0;
    v.stomp_auto_run_dir = 1;
    v.stomp_auto_run_timer = STOMP_AUTO_RUN_MIN_T * 2;
    let r = &mut s.players[rider];
    r.clear_stomp();
    r.x = vx;
    r.y = vy - PLAYER_H_FP;
    r.vx = 0;
    r.vy = 0;
    r.grounded = true;
    r.flags = flag::ALIVE;
    r.health = MAX_HEALTH;
    r.lives = TUTORIAL_LIVES;
    r.stomping_on = victim as i32;
}

/// Keep a lesson's victim topped up so the ride never ends by damage (only by shaking free).
pub fn pin_health(s: &mut State, slot: usize) {
    s.players[slot].health = MAX_HEALTH;
    s.players[slot].stomp_damage_taken = 0;
}

/// The dummy stands `KILL_OFFSET_PX` ahead of the student, nearly dead and unstompable.
pub fn stage_kill(s: &mut State, student: usize, target: usize) {
    let st = s.players[student];
    s.players[student].clear_stomp();
    let t = &mut s.players[target];
    t.clear_stomp();
    t.x = (st.x + st.facing * fp(KILL_OFFSET_PX)).clamp(0, fp(960 - 24));
    t.y = st.y;
    t.vx = 0;
    t.vy = 0;
    t.flags = flag::ALIVE;
    t.health = KILL_TARGET_HP;
    t.lives = TUTORIAL_LIVES;
    t.grounded = true;
    t.stomp_cooldown = NEVER_STOMPABLE_T;
    t.weapon = crate::weapons::NONE;
}
