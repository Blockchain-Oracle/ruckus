//! Bot policy ported from Chickenz `services/server/src/BotAI.ts`, made deterministic: integer maths
//! in whole pixels, and a private PRNG stream per bot (the original used Math.random). Bots read the
//! state and return an input; they never mutate the sim. RUCKUS changes: FFA targeting, no rubber
//! banding, no disguises (bots are always labelled by the UI).

use crate::constants::{MAX_PLAYERS, PLAYER_H_FP, PLAYER_W_FP};
use crate::fixed::{isqrt, px};
use crate::map::{Map, Platform};
use crate::prng::{derive_seed, Rng};
use crate::state::{button, Input, Player, State, NOBODY};
use crate::weapons;

const BODY_W: i32 = px(PLAYER_W_FP);
const BODY_H: i32 = px(PLAYER_H_FP);

/// Difficulty anchors at 0 (easy), 50 (medium) and 100 (hard); probabilities are per mille.
#[derive(Clone, Copy)]
struct Params {
    dodge_permille: i32,
    dodge_reaction_t: i32,
    dodge_min_t: i32,
    dodge_jump_permille: i32,
    shoot_permille: i32,
    decision_interval_t: i32,
    stomp_permille: i32,
    pickup_detour_px: i32,
    /// RUCKUS: ticks between L/R flips while escaping a stomp (faster = escapes sooner).
    shake_interval_t: i32,
}

const EASY: Params = Params { dodge_permille: 120, dodge_reaction_t: 20, dodge_min_t: 12, dodge_jump_permille: 150, shoot_permille: 350, decision_interval_t: 13, stomp_permille: 50, pickup_detour_px: 400, shake_interval_t: 12 };
const MEDIUM: Params = Params { dodge_permille: 500, dodge_reaction_t: 14, dodge_min_t: 7, dodge_jump_permille: 350, shoot_permille: 600, decision_interval_t: 8, stomp_permille: 250, pickup_detour_px: 350, shake_interval_t: 9 };
const HARD: Params = Params { dodge_permille: 800, dodge_reaction_t: 20, dodge_min_t: 4, dodge_jump_permille: 600, shoot_permille: 800, decision_interval_t: 6, stomp_permille: 500, pickup_detour_px: 500, shake_interval_t: 6 };

pub const DIFFICULTY_MAX: i32 = 100;

fn lerp(a: i32, b: i32, t: i32, span: i32) -> i32 {
    // Rounded integer lerp.
    a + ((b - a) * t + span / 2 * (b - a).signum()) / span
}

fn params(level: i32) -> Params {
    let level = level.clamp(0, DIFFICULTY_MAX);
    let half = DIFFICULTY_MAX / 2;
    let (lo, hi, t) = if level <= half { (EASY, MEDIUM, level) } else { (MEDIUM, HARD, level - half) };
    let l = |a: i32, b: i32| lerp(a, b, t, half);
    Params {
        dodge_permille: l(lo.dodge_permille, hi.dodge_permille),
        dodge_reaction_t: l(lo.dodge_reaction_t, hi.dodge_reaction_t),
        dodge_min_t: l(lo.dodge_min_t, hi.dodge_min_t),
        dodge_jump_permille: l(lo.dodge_jump_permille, hi.dodge_jump_permille),
        shoot_permille: l(lo.shoot_permille, hi.shoot_permille),
        decision_interval_t: l(lo.decision_interval_t, hi.decision_interval_t),
        stomp_permille: l(lo.stomp_permille, hi.stomp_permille),
        pickup_detour_px: l(lo.pickup_detour_px, hi.pickup_detour_px),
        shake_interval_t: l(lo.shake_interval_t, hi.shake_interval_t),
    }
}

const NAV_APPROACH: u8 = 0;
const NAV_JUMP: u8 = 1;
const NAV_LAND: u8 = 2;
const NAV_GIVE_UP_T: i32 = 120;

#[derive(Clone, Copy, Debug)]
struct Nav {
    plat_y: i32,
    approach_x: i32,
    inward_dir: i32,
    phase: u8,
    ticks: i32,
}

// Tuning from the original, in px / ticks.
const DODGE_LANE_PX: i32 = 70;
const DODGE_JUMP_WITHIN_T: i32 = 10;
const DODGE_JUMP_COOLDOWN_T: i32 = 30;
const STUCK_T: i32 = 25;
const JUMP_REACH_PX: i32 = 120;
const DOUBLE_JUMP_REACH_PX: i32 = 200;
const ENGAGE_PX: i32 = 100;
const CHASE_DEADBAND_PX: i32 = 20;
const EDGE_JUMP_PX: i32 = 12;
const GROUND_BAND_PX: i32 = 40;
const PLATFORM_FOOT_TOLERANCE_PX: i32 = 8;
/// Switch targets only when another bird is this much closer (percent), so bots don't dither.
const RETARGET_PERCENT: i32 = 70;

const fn shoot_range_px(w: i8) -> i32 {
    match w {
        weapons::SHOTGUN => 180,
        weapons::SNIPER => 600,
        weapons::SMG => 280,
        _ => 300,
    }
}

#[derive(Clone, Debug)]
pub struct Bot {
    pub slot: usize,
    pub difficulty: i32,
    rng: Rng,
    jump_cooldown: i32,
    shooting: bool,
    decision_tick: i32,
    last_x: i32,
    last_y: i32,
    stuck_ticks: i32,
    nav: Option<Nav>,
    target: i32,
    taunt_on: bool,
    taunt_timer: i32,
}

#[derive(Clone, Copy)]
struct Body {
    x: i32,
    y: i32,
    vx: i32,
}

fn body(p: &Player) -> Body {
    Body { x: px(p.x), y: px(p.y), vx: p.vx }
}

fn plat_px(p: &Platform) -> (i32, i32, i32, i32) {
    (px(p.x), px(p.y), px(p.w), px(p.h))
}

fn platform_at(map: &Map, x: i32, feet_y: i32) -> Option<(i32, i32, i32, i32)> {
    map.platforms.iter().filter(|p| !p.is_empty()).map(plat_px).find(|&(px_, py, pw, _)| {
        x >= px_ && x <= px_ + pw && feet_y >= py - PLATFORM_FOOT_TOLERANCE_PX && feet_y <= py + PLATFORM_FOOT_TOLERANCE_PX
    })
}

fn under_platform(map: &Map, x: i32, y: i32) -> Option<(i32, i32, i32, i32)> {
    map.platforms.iter().filter(|p| !p.is_empty()).map(plat_px).find(|&(px_, py, pw, ph)| {
        py + ph <= y && y - py < JUMP_REACH_PX && x + BODY_W > px_ && x < px_ + pw
    })
}

fn nearest_platform_above(map: &Map, x: i32, y: i32, toward: Option<i32>) -> Option<(i32, i32, i32, i32)> {
    let mut best = None;
    let mut best_score = i64::MAX;
    for p in map.platforms.iter().filter(|p| !p.is_empty()).map(plat_px) {
        let gap = y - p.1;
        if !(20..=DOUBLE_JUMP_REACH_PX).contains(&gap) {
            continue;
        }
        let cx = p.0 + p.2 / 2;
        // score = |dx| + 1.5·gap, halved when the platform lies toward the target (×2 to stay integral).
        let mut score = 2 * (x - cx).abs() as i64 + 3 * gap as i64;
        if let Some(tx) = toward {
            if (tx - x) as i64 * (cx - x) as i64 > 0 {
                score /= 2;
            }
        }
        if score < best_score {
            best_score = score;
            best = Some(p);
        }
    }
    best
}

fn plan_nav(b: &Body, p: (i32, i32, i32, i32), zone_left: i32, zone_right: i32) -> Nav {
    let left_edge = p.0 - BODY_W - 8;
    let right_edge = p.0 + p.2 + 8;
    let left_ok = left_edge >= zone_left;
    let right_ok = right_edge + BODY_W <= zone_right;
    let nearer_left = (b.x - left_edge).abs() <= (b.x - right_edge).abs();
    let use_left = match (left_ok, right_ok) {
        (true, true) | (false, false) => nearer_left,
        (true, false) => true,
        (false, true) => false,
    };
    if use_left {
        Nav { plat_y: p.1, approach_x: left_edge.max(zone_left), inward_dir: 1, phase: NAV_APPROACH, ticks: 0 }
    } else {
        Nav { plat_y: p.1, approach_x: right_edge.min(zone_right - BODY_W), inward_dir: -1, phase: NAV_APPROACH, ticks: 0 }
    }
}

fn drop_down_dir(b: &Body, opp: &Body, map: &Map) -> u8 {
    let feet = b.y + BODY_H;
    let plat = platform_at(map, b.x + 4, feet).or_else(|| platform_at(map, b.x + BODY_W - 4, feet));
    let Some((x, y, w, _)) = plat else { return 0 };
    if y >= px(map.height) - GROUND_BAND_PX {
        return 0;
    }
    let ocx = opp.x + BODY_W / 2;
    if ocx < x {
        return button::LEFT;
    }
    if ocx > x + w {
        return button::RIGHT;
    }
    if b.x - x < x + w - (b.x + BODY_W) {
        button::LEFT
    } else {
        button::RIGHT
    }
}

impl Bot {
    pub fn new(match_seed: u32, slot: usize, difficulty: i32) -> Bot {
        Bot {
            slot,
            difficulty: difficulty.clamp(0, DIFFICULTY_MAX),
            rng: Rng(derive_seed(match_seed, 0xB07 + slot as u32)),
            jump_cooldown: 0,
            shooting: false,
            decision_tick: 0,
            last_x: -1,
            last_y: -1,
            stuck_ticks: 0,
            nav: None,
            target: NOBODY,
            taunt_on: false,
            taunt_timer: 0,
        }
    }

    fn pick_target(&mut self, state: &State) -> i32 {
        let me = body(&state.players[self.slot]);
        let dist = |i: usize| {
            let o = body(&state.players[i]);
            (o.x - me.x).abs() + (o.y - me.y).abs()
        };
        let mut best = NOBODY;
        let mut best_d = i32::MAX;
        for i in 0..state.n() {
            let p = &state.players[i];
            if i == self.slot || !p.alive() {
                continue;
            }
            let d = dist(i);
            if d < best_d {
                best_d = d;
                best = i as i32;
            }
        }
        let current_ok = self.target >= 0
            && (self.target as usize) < state.n()
            && self.target as usize != self.slot
            && state.players[self.target as usize].alive();
        if current_ok && best >= 0 && best != self.target {
            // Hysteresis: keep the current fight unless someone is clearly closer.
            if best_d * 100 >= dist(self.target as usize) * RETARGET_PERCENT {
                return self.target;
            }
        }
        self.target = best;
        best
    }

    pub fn think(&mut self, state: &State, map: &Map) -> Input {
        let me = state.players[self.slot];
        let d = params(self.difficulty);
        if self.jump_cooldown > 0 {
            self.jump_cooldown -= 1;
        }

        if !me.alive() || me.respawn_timer > 0 {
            self.last_x = -1;
            self.last_y = -1;
            self.stuck_ticks = 0;
            self.nav = None;
            return Input::default();
        }
        let b = body(&me);
        if self.last_x >= 0 && (b.x - self.last_x).abs() < 1 && (b.y - self.last_y).abs() < 1 {
            self.stuck_ticks += 1;
        } else {
            self.stuck_ticks = 0;
        }
        self.last_x = b.x;
        self.last_y = b.y;

        // Last bird standing: taunt through the linger.
        if state.death_linger_timer > 0 || state.match_over {
            return self.taunt();
        }

        let target = self.pick_target(state);
        let opp_alive = target >= 0;
        let opp = if opp_alive { body(&state.players[target as usize]) } else { b };
        let (dx, dy) = (opp.x - b.x, opp.y - b.y);
        let dist = isqrt((dx as i64) * (dx as i64) + (dy as i64) * (dy as i64)).max(1) as i32;
        let has_weapon = me.weapon >= 0 && me.ammo > 0;
        let aim_x: i8 = if dx > 8 { 1 } else if dx < -8 { -1 } else if b.vx >= 0 { 1 } else { -1 };

        if me.stomped_by >= 0 {
            self.nav = None;
            let left = (state.tick / d.shake_interval_t) % 2 == 0;
            return Input { buttons: if left { button::LEFT } else { button::RIGHT }, aim_x: if left { -1 } else { 1 }, aim_y: 0 };
        }

        let mut buttons = 0u8;
        let dodging = self.dodge(state, &b, &d, &mut buttons);

        if !dodging {
            self.navigate(&b, &me, map, &mut buttons);
            if self.nav.is_none() {
                self.decide_movement(state, map, &b, &me, &opp, opp_alive, has_weapon, dx, dy, &d, &mut buttons);
            }
            self.decide_shooting(state, &me, opp_alive, has_weapon, dist, &d, &mut buttons);
        }

        let final_aim = if buttons & button::RIGHT != 0 {
            1
        } else if buttons & button::LEFT != 0 {
            -1
        } else {
            aim_x
        };
        Input { buttons, aim_x: final_aim, aim_y: 0 }
    }

    fn taunt(&mut self) -> Input {
        if self.taunt_timer <= 0 {
            self.taunt_on = !self.taunt_on;
            self.taunt_timer = self.rng.range(4, 8);
        }
        self.taunt_timer -= 1;
        Input { buttons: if self.taunt_on { button::TAUNT } else { 0 }, aim_x: 0, aim_y: 0 }
    }

    /// Perpendicular-distance check against every incoming projectile (`BotAI.ts:507-540`).
    fn dodge(&mut self, state: &State, b: &Body, d: &Params, buttons: &mut u8) -> bool {
        for i in 0..state.proj_count as usize {
            let pr = &state.projectiles[i];
            if pr.owner == self.slot as i32 {
                continue;
            }
            let (rx, ry) = ((b.x - px(pr.x)) as i64, (b.y - px(pr.y)) as i64);
            let (vx, vy) = (pr.vx as i64, pr.vy as i64);
            let speed = isqrt(vx * vx + vy * vy).max(1);
            let dot = rx * vx + ry * vy; // px·Fp
            if dot < 0 {
                continue;
            }
            // Along-track distance (px) = dot/speed; ticks = distance / (speed/256).
            let ticks = (dot * 256 / (speed * speed)) as i32;
            if ticks > d.dodge_reaction_t || ticks < d.dodge_min_t {
                continue;
            }
            let cross = vx * ry - vy * rx;
            if cross.abs() / speed >= DODGE_LANE_PX as i64 {
                continue;
            }
            if !self.rng.chance(d.dodge_permille) {
                continue;
            }
            self.nav = None;
            *buttons |= if cross > 0 { button::RIGHT } else { button::LEFT };
            let grounded = state.players[self.slot].grounded;
            if grounded && ticks < DODGE_JUMP_WITHIN_T && self.jump_cooldown <= 0 && self.rng.chance(d.dodge_jump_permille) {
                *buttons |= button::JUMP;
                self.jump_cooldown = DODGE_JUMP_COOLDOWN_T;
            }
            return true;
        }
        false
    }

    /// Platform navigation state machine: approach an edge, jump (double-jump near the apex), land.
    fn navigate(&mut self, b: &Body, me: &Player, map: &Map, buttons: &mut u8) {
        let Some(mut nav) = self.nav else { return };
        nav.ticks += 1;
        if nav.ticks > NAV_GIVE_UP_T {
            self.nav = None;
            return;
        }
        match nav.phase {
            NAV_APPROACH => {
                let adx = nav.approach_x - b.x;
                let under = under_platform(map, b.x, b.y);
                if let (Some(p), true) = (under, adx.abs() <= 8) {
                    self.nav = Some(plan_nav(b, p, 0, px(map.width)));
                    return;
                } else if adx.abs() > 4 || under.is_some() {
                    *buttons |= if adx < 0 { button::LEFT } else { button::RIGHT };
                } else if me.grounded && self.jump_cooldown <= 0 {
                    nav.phase = NAV_JUMP;
                    *buttons |= button::JUMP;
                    self.jump_cooldown = 5;
                }
            }
            NAV_JUMP => {
                if b.y + BODY_H < nav.plat_y - 4 {
                    nav.phase = NAV_LAND;
                } else {
                    // Double jump near the apex (vy > -2 px/t) for maximum height.
                    if !me.grounded && me.jumps_left > 0 && me.vy > -512 && self.jump_cooldown <= 0 {
                        *buttons |= button::JUMP;
                        self.jump_cooldown = 5;
                    }
                    if me.grounded && nav.ticks > 10 {
                        nav.phase = NAV_APPROACH;
                    }
                }
            }
            _ => {
                *buttons |= if nav.inward_dir > 0 { button::RIGHT } else { button::LEFT };
                if me.grounded && b.y <= nav.plat_y {
                    self.nav = None;
                    return;
                }
                if b.y > nav.plat_y + 40 {
                    nav.phase = NAV_APPROACH;
                }
            }
        }
        self.nav = Some(nav);
    }

    fn walk_toward(dx: i32, deadband: i32, buttons: &mut u8) {
        if dx < -deadband {
            *buttons |= button::LEFT;
        } else if dx > deadband {
            *buttons |= button::RIGHT;
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn decide_movement(&mut self, state: &State, map: &Map, b: &Body, me: &Player, opp: &Body, opp_alive: bool, has_weapon: bool, dx: i32, dy: i32, d: &Params, buttons: &mut u8) {
        let (zl, zr) = (px(state.zone_left), px(state.zone_right));
        let chase = |bot: &mut Bot, buttons: &mut u8, deadband: i32| {
            if !opp_alive {
                return;
            }
            if dy < -20 {
                if let Some(p) = under_platform(map, b.x, b.y) {
                    bot.nav = Some(plan_nav(b, p, zl, zr));
                } else if me.grounded {
                    match nearest_platform_above(map, b.x, b.y, Some(opp.x)) {
                        Some(p) => bot.nav = Some(plan_nav(b, p, zl, zr)),
                        None => Bot::walk_toward(dx, deadband, buttons),
                    }
                } else {
                    Bot::walk_toward(dx, deadband, buttons);
                }
            } else if dy > 30 && me.grounded {
                match drop_down_dir(b, opp, map) {
                    0 => Bot::walk_toward(dx, deadband, buttons),
                    dir => *buttons |= dir,
                }
            } else {
                Bot::walk_toward(dx, deadband, buttons);
            }
        };

        if !has_weapon {
            // Nearest live pedestal within the detour budget.
            let mut best: Option<(i32, i32, i32)> = None;
            for i in 0..state.pickup_count as usize {
                let pk = &state.pickups[i];
                if pk.respawn_timer > 0 {
                    continue;
                }
                let dd = (px(pk.x) - b.x).abs() + (px(pk.y) - b.y).abs();
                if best.is_none_or(|(bd, _, _)| dd < bd) {
                    best = Some((dd, px(pk.x), px(pk.y)));
                }
            }
            match best {
                Some((dd, kx, ky)) if dd < d.pickup_detour_px => {
                    if ky - b.y < -JUMP_REACH_PX {
                        if let Some(p) = nearest_platform_above(map, b.x + BODY_W / 2, b.y, Some(kx)) {
                            self.nav = Some(plan_nav(b, p, zl, zr));
                        }
                    } else if (kx - b.x).abs() > 8 {
                        *buttons &= !(button::LEFT | button::RIGHT);
                        *buttons |= if kx < b.x { button::LEFT } else { button::RIGHT };
                    }
                }
                _ => chase(self, buttons, CHASE_DEADBAND_PX),
            }
        } else {
            chase(self, buttons, ENGAGE_PX);
        }

        let wants_drop = opp_alive && dy > 30;
        if me.grounded && self.jump_cooldown <= 0 && !wants_drop {
            let (left, right) = (*buttons & button::LEFT != 0, *buttons & button::RIGHT != 0);
            if left || right {
                if let Some((x, y, w, _)) = platform_at(map, b.x + BODY_W / 2, b.y + BODY_H) {
                    if y < px(map.height) - GROUND_BAND_PX {
                        let to_edge = if left { b.x - x } else { x + w - (b.x + BODY_W) };
                        if (0..EDGE_JUMP_PX).contains(&to_edge) {
                            *buttons |= button::JUMP;
                            self.jump_cooldown = 8;
                        }
                    }
                }
            }
        }

        if self.jump_cooldown <= 0 && !wants_drop {
            if opp_alive && dy < -40 {
                let climb = self.rng.chance(d.stomp_permille);
                if climb && me.grounded {
                    match nearest_platform_above(map, b.x + BODY_W / 2, b.y, None) {
                        Some(p) if b.y > p.1 + 20 => self.nav = Some(plan_nav(b, p, zl, zr)),
                        _ => match under_platform(map, b.x, b.y) {
                            Some(p) => self.nav = Some(plan_nav(b, p, zl, zr)),
                            None => {
                                *buttons |= button::JUMP;
                                self.jump_cooldown = 25;
                            }
                        },
                    }
                } else if climb && me.jumps_left > 0 && me.vy > 0 {
                    *buttons |= button::JUMP;
                    self.jump_cooldown = 25;
                }
            }
            if me.wall_sliding {
                *buttons |= button::JUMP;
                self.jump_cooldown = 10;
            }
        }

        if self.stuck_ticks > STUCK_T {
            if let Some(p) = under_platform(map, b.x, b.y) {
                self.nav = Some(plan_nav(b, p, zl, zr));
            } else {
                *buttons &= !(button::LEFT | button::RIGHT);
                let toward = if dx < 0 { button::LEFT } else { button::RIGHT };
                let away = if dx < 0 { button::RIGHT } else { button::LEFT };
                *buttons |= if state.tick % 50 < 25 { toward } else { away };
                if self.jump_cooldown <= 0 {
                    *buttons |= button::JUMP;
                    self.jump_cooldown = 10;
                }
            }
            self.stuck_ticks = 0;
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn decide_shooting(&mut self, state: &State, me: &Player, opp_alive: bool, has_weapon: bool, dist: i32, d: &Params, buttons: &mut u8) {
        if !(opp_alive && has_weapon && me.shoot_cooldown <= 0) || dist >= shoot_range_px(me.weapon) {
            self.shooting = false;
            return;
        }
        if state.tick >= self.decision_tick {
            self.shooting = self.rng.chance(d.shoot_permille);
            self.decision_tick = state.tick + d.decision_interval_t;
        }
        if self.shooting {
            *buttons |= button::SHOOT;
        }
    }
}

/// Fill the bot-controlled slots of `out`; human slots are left untouched.
pub fn bot_inputs(bots: &mut [Bot], state: &State, map: &Map, out: &mut [Input; MAX_PLAYERS]) {
    for bot in bots.iter_mut() {
        if bot.slot < state.n() {
            out[bot.slot] = bot.think(state, map);
        }
    }
}
