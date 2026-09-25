use crate::constants::*;
use crate::fixed::Fp;
use crate::map::{Map, MapId, NUM_SPAWNS};
use crate::prng::Rng;
use crate::weapons::{self, Weapon};

pub mod button {
    pub const LEFT: u8 = 1;
    pub const RIGHT: u8 = 2;
    pub const JUMP: u8 = 4;
    pub const SHOOT: u8 = 8;
    /// Cosmetic only: the sim ignores it; renderers play the taunt.
    pub const TAUNT: u8 = 16;
}

pub mod flag {
    pub const ALIVE: u32 = 1;
    pub const INVINCIBLE: u32 = 2;
}

pub const FACING_RIGHT: i32 = 1;
pub const FACING_LEFT: i32 = -1;
/// No player / no link.
pub const NOBODY: i32 = -1;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Input {
    pub buttons: u8,
    pub aim_x: i8,
    pub aim_y: i8,
}

pub const NULL_INPUT: Input = Input { buttons: 0, aim_x: 0, aim_y: 0 };

#[derive(Clone, Copy, Debug, Default)]
pub struct Player {
    pub x: Fp,
    pub y: Fp,
    pub vx: Fp,
    pub vy: Fp,
    pub facing: i32,
    pub health: i32,
    pub lives: i32,
    pub shoot_cooldown: i32,
    pub grounded: bool,
    pub flags: u32,
    pub respawn_timer: i32,
    pub weapon: Weapon,
    pub ammo: i32,
    pub jumps_left: i32,
    pub jump_buffer: i32,
    pub wall_sliding: bool,
    pub wall_dir: i32,
    pub stomped_by: i32,
    pub stomping_on: i32,
    pub stomp_shake_progress: i32,
    pub stomp_last_shake_dir: i32,
    pub stomp_auto_run_dir: i32,
    pub stomp_auto_run_timer: i32,
    pub stomp_cooldown: i32,
    pub stomp_damage_taken: i32,
    /// Tick this player was eliminated (0 = still in); the renderer uses it for death order.
    pub died_at: i32,
}

impl Player {
    #[inline(always)]
    pub fn alive(&self) -> bool {
        self.flags & flag::ALIVE != 0
    }
    #[inline(always)]
    pub fn invincible(&self) -> bool {
        self.flags & flag::INVINCIBLE != 0
    }
    pub fn clear_stomp(&mut self) {
        self.stomped_by = NOBODY;
        self.stomping_on = NOBODY;
        self.stomp_shake_progress = 0;
        self.stomp_last_shake_dir = 0;
        self.stomp_auto_run_dir = 0;
        self.stomp_auto_run_timer = 0;
        self.stomp_damage_taken = 0;
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Projectile {
    pub id: i32,
    pub owner: i32,
    pub x: Fp,
    pub y: Fp,
    pub vx: Fp,
    pub vy: Fp,
    pub lifetime: i32,
    pub weapon: Weapon,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Pickup {
    pub x: Fp,
    pub y: Fp,
    pub weapon: Weapon,
    pub respawn_timer: i32,
}

#[derive(Clone, Copy, Debug)]
pub struct Config {
    pub player_count: u8,
    pub map: MapId,
    pub initial_lives: i32,
    pub round_ticks: i32,
    pub sudden_death_tick: i32,
}

impl Config {
    /// Standard FFA round for `player_count` (clamped to 2..=4) on `map`.
    pub fn standard(player_count: u8, map: MapId) -> Self {
        let n = player_count.clamp(2, MAX_PLAYERS as u8);
        let round_ticks = ROUND_T_BY_PLAYERS[n as usize];
        Config {
            player_count: n,
            map,
            initial_lives: INITIAL_LIVES,
            round_ticks,
            sudden_death_tick: round_ticks - SUDDEN_DEATH_LEAD_T,
        }
    }
}

#[derive(Clone, Debug)]
pub struct State {
    pub cfg: Config,
    pub tick: i32,
    pub players: [Player; MAX_PLAYERS],
    pub projectiles: [Projectile; MAX_PROJECTILES],
    pub proj_count: u8,
    pub pickups: [Pickup; MAX_WEAPON_PICKUPS],
    pub pickup_count: u8,
    pub rng: Rng,
    /// Kills per player.
    pub score: [u32; MAX_PLAYERS],
    pub next_proj_id: i32,
    pub zone_left: Fp,
    pub zone_right: Fp,
    pub match_over: bool,
    pub winner: i32,
    pub death_linger_timer: i32,
    pub prev_buttons: [u8; MAX_PLAYERS],
}

impl State {
    #[inline(always)]
    pub fn n(&self) -> usize {
        self.cfg.player_count as usize
    }

    pub fn new(seed: u32, cfg: Config, map: &Map) -> State {
        let mut rng = Rng(seed);

        // Seeded spawn shuffle (Fisher–Yates): slot 0 is not "the host's spot" any more.
        let mut order = [0usize, 1, 2, 3];
        for i in (1..NUM_SPAWNS).rev() {
            let j = rng.range(0, i as i32) as usize;
            order.swap(i, j);
        }

        let mut players = [Player::default(); MAX_PLAYERS];
        let centre = map.width / 2;
        for (i, p) in players.iter_mut().enumerate().take(cfg.player_count as usize) {
            let spawn = map.spawns[order[i]];
            *p = Player {
                x: spawn.x,
                y: spawn.y,
                facing: if spawn.x < centre { FACING_RIGHT } else { FACING_LEFT },
                health: MAX_HEALTH,
                lives: cfg.initial_lives,
                flags: flag::ALIVE,
                weapon: weapons::NONE,
                jumps_left: MAX_JUMPS,
                ..Player::default()
            };
            p.clear_stomp();
        }
        // Unused slots are permanently out; loops stop at n() anyway.
        for p in players.iter_mut().skip(cfg.player_count as usize) {
            p.clear_stomp();
            p.weapon = weapons::NONE;
        }

        let mut pickups = [Pickup::default(); MAX_WEAPON_PICKUPS];
        for (i, pk) in pickups.iter_mut().enumerate() {
            *pk = Pickup {
                x: map.weapon_spawns[i].x,
                y: map.weapon_spawns[i].y,
                weapon: weapons::ROTATION[i % weapons::COUNT],
                respawn_timer: 0,
            };
        }

        State {
            cfg,
            tick: 0,
            players,
            projectiles: [Projectile::default(); MAX_PROJECTILES],
            proj_count: 0,
            pickups,
            pickup_count: MAX_WEAPON_PICKUPS as u8,
            rng,
            score: [0; MAX_PLAYERS],
            next_proj_id: 0,
            zone_left: 0,
            zone_right: map.width,
            match_over: false,
            winner: NOBODY,
            death_linger_timer: 0,
            prev_buttons: [0; MAX_PLAYERS],
        }
    }
}
