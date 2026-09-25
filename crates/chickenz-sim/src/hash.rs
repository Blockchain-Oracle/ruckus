//! One field walker drives the state hash, the snapshot encoder and the decoder, so the three can
//! never disagree about layout. Every field is carried as an i32 (little-endian in snapshots).

use crate::constants::{MAX_PLAYERS, MAX_PROJECTILES, MAX_WEAPON_PICKUPS};
use crate::prng::Rng;
use crate::state::{Config, Pickup, Player, Projectile, State};

pub const SNAPSHOT_VERSION: i32 = 1;

trait Io {
    fn i32(&mut self, v: &mut i32);

    fn u32(&mut self, v: &mut u32) {
        let mut x = *v as i32;
        self.i32(&mut x);
        *v = x as u32;
    }
    fn u8(&mut self, v: &mut u8) {
        let mut x = *v as i32;
        self.i32(&mut x);
        *v = x as u8;
    }
    fn i8(&mut self, v: &mut i8) {
        let mut x = *v as i32;
        self.i32(&mut x);
        *v = x as i8;
    }
    fn bool(&mut self, v: &mut bool) {
        let mut x = *v as i32;
        self.i32(&mut x);
        *v = x != 0;
    }
}

fn player(io: &mut impl Io, p: &mut Player) {
    for f in [
        &mut p.x, &mut p.y, &mut p.vx, &mut p.vy, &mut p.facing, &mut p.health, &mut p.lives,
        &mut p.shoot_cooldown, &mut p.respawn_timer, &mut p.ammo, &mut p.jumps_left, &mut p.jump_buffer,
        &mut p.wall_dir, &mut p.stomped_by, &mut p.stomping_on, &mut p.stomp_shake_progress,
        &mut p.stomp_last_shake_dir, &mut p.stomp_auto_run_dir, &mut p.stomp_auto_run_timer,
        &mut p.stomp_cooldown, &mut p.stomp_damage_taken, &mut p.died_at,
    ] {
        io.i32(f);
    }
    io.bool(&mut p.grounded);
    io.u32(&mut p.flags);
    io.i8(&mut p.weapon);
    io.bool(&mut p.wall_sliding);
}

fn projectile(io: &mut impl Io, p: &mut Projectile) {
    for f in [&mut p.id, &mut p.owner, &mut p.x, &mut p.y, &mut p.vx, &mut p.vy, &mut p.lifetime] {
        io.i32(f);
    }
    io.i8(&mut p.weapon);
}

fn pickup(io: &mut impl Io, p: &mut Pickup) {
    io.i32(&mut p.x);
    io.i32(&mut p.y);
    io.i8(&mut p.weapon);
    io.i32(&mut p.respawn_timer);
}

fn config(io: &mut impl Io, c: &mut Config) {
    io.u8(&mut c.player_count);
    io.u8(&mut c.map);
    io.i32(&mut c.initial_lives);
    io.i32(&mut c.round_ticks);
    io.i32(&mut c.sudden_death_tick);
}

fn walk(io: &mut impl Io, s: &mut State) {
    config(io, &mut s.cfg);
    io.i32(&mut s.tick);
    for p in s.players.iter_mut() {
        player(io, p);
    }
    io.u8(&mut s.proj_count);
    // Only live projectiles are part of the state; dead slots may hold stale data.
    for i in 0..(s.proj_count as usize).min(MAX_PROJECTILES) {
        projectile(io, &mut s.projectiles[i]);
    }
    io.u8(&mut s.pickup_count);
    for p in s.pickups.iter_mut() {
        pickup(io, p);
    }
    io.u32(&mut s.rng.0);
    for v in s.score.iter_mut() {
        io.u32(v);
    }
    io.i32(&mut s.next_proj_id);
    io.i32(&mut s.zone_left);
    io.i32(&mut s.zone_right);
    io.bool(&mut s.match_over);
    io.i32(&mut s.winner);
    io.i32(&mut s.death_linger_timer);
    for b in s.prev_buttons.iter_mut() {
        io.u8(b);
    }
}

const FNV_OFFSET: u64 = 0xCBF2_9CE4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01B3;

struct Fnv(u64);
impl Io for Fnv {
    fn i32(&mut self, v: &mut i32) {
        for b in v.to_le_bytes() {
            self.0 ^= b as u64;
            self.0 = self.0.wrapping_mul(FNV_PRIME);
        }
    }
}

/// FNV-1a 64 over the canonical field walk: a cheap per-tick fingerprint for determinism checks.
pub fn state_hash(state: &State) -> u64 {
    let mut s = state.clone();
    let mut h = Fnv(FNV_OFFSET);
    walk(&mut h, &mut s);
    h.0
}

struct Writer(Vec<u8>);
impl Io for Writer {
    fn i32(&mut self, v: &mut i32) {
        self.0.extend_from_slice(&v.to_le_bytes());
    }
}

pub fn encode(state: &State) -> Vec<u8> {
    let mut s = state.clone();
    let mut w = Writer(Vec::with_capacity(1024));
    let mut version = SNAPSHOT_VERSION;
    w.i32(&mut version);
    walk(&mut w, &mut s);
    w.0
}

struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
    ok: bool,
}
impl Io for Reader<'_> {
    fn i32(&mut self, v: &mut i32) {
        if self.at + 4 > self.bytes.len() {
            self.ok = false;
            return;
        }
        let b = &self.bytes[self.at..self.at + 4];
        *v = i32::from_le_bytes([b[0], b[1], b[2], b[3]]);
        self.at += 4;
    }
}

/// Decode a snapshot; `None` for truncated or foreign-version bytes (never trust the wire).
pub fn decode(bytes: &[u8]) -> Option<State> {
    let mut r = Reader { bytes, at: 0, ok: true };
    let mut version = 0;
    r.i32(&mut version);
    if !r.ok || version != SNAPSHOT_VERSION {
        return None;
    }
    let mut s = State {
        cfg: Config { player_count: 2, map: 0, initial_lives: 1, round_ticks: 0, sudden_death_tick: 0 },
        tick: 0,
        players: [Player::default(); MAX_PLAYERS],
        projectiles: [Projectile::default(); MAX_PROJECTILES],
        proj_count: 0,
        pickups: [Pickup::default(); MAX_WEAPON_PICKUPS],
        pickup_count: 0,
        rng: Rng(0),
        score: [0; MAX_PLAYERS],
        next_proj_id: 0,
        zone_left: 0,
        zone_right: 0,
        match_over: false,
        winner: -1,
        death_linger_timer: 0,
        prev_buttons: [0; MAX_PLAYERS],
    };
    // proj_count is read before the projectile loop, so the walk self-limits; clamp for safety.
    walk(&mut r, &mut s);
    if !r.ok || s.proj_count as usize > MAX_PROJECTILES || s.cfg.player_count as usize > MAX_PLAYERS {
        return None;
    }
    Some(s)
}
