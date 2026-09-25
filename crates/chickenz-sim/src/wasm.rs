//! wasm-bindgen surface. Kept thin: packed inputs in, flat views and bytes out, no per-tick JSON.

use wasm_bindgen::prelude::*;

use crate::bot::Bot;
use crate::constants::MAX_PLAYERS;
use crate::hash;
use crate::map::{self, Map};
use crate::runner;
use crate::state::{Config, Input, State};
use crate::step::step;
use crate::view;

#[wasm_bindgen]
pub struct Sim {
    state: State,
    map: Map,
    bots: [Option<Bot>; MAX_PLAYERS],
    inputs: [Input; MAX_PLAYERS],
    seed: u32,
}

#[wasm_bindgen]
impl Sim {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32, player_count: u8, map_id: u8) -> Sim {
        let map = map::by_id(map_id);
        let state = State::new(seed, Config::standard(player_count, map_id), &map);
        Sim { state, map, bots: [None, None, None, None], inputs: [Input::default(); MAX_PLAYERS], seed }
    }

    /// Hand a slot to the deterministic bot (difficulty 0–100).
    pub fn set_bot(&mut self, slot: usize, difficulty: i32) {
        if slot < MAX_PLAYERS {
            self.bots[slot] = Some(Bot::new(self.seed, slot, difficulty));
        }
    }

    pub fn clear_bot(&mut self, slot: usize) {
        if slot < MAX_PLAYERS {
            self.bots[slot] = None;
        }
    }

    pub fn set_input(&mut self, slot: usize, buttons: u8, aim_x: i8, aim_y: i8) {
        if slot < MAX_PLAYERS {
            self.inputs[slot] = Input { buttons, aim_x, aim_y };
        }
    }

    /// The input a slot used last tick (bots included), e.g. for replays and netcode.
    pub fn input_of(&self, slot: usize) -> u32 {
        let i = self.inputs[slot.min(MAX_PLAYERS - 1)];
        i.buttons as u32 | ((i.aim_x as u8 as u32) << 8) | ((i.aim_y as u8 as u32) << 16)
    }

    /// Bots decide from the pre-step state, then everyone moves together.
    pub fn step(&mut self) {
        for bot in self.bots.iter_mut().flatten() {
            self.inputs[bot.slot] = bot.think(&self.state, &self.map);
        }
        step(&mut self.state, &self.inputs, &self.map);
    }

    pub fn step_many(&mut self, ticks: u32) {
        for _ in 0..ticks {
            self.step();
        }
    }

    pub fn tick(&self) -> i32 {
        self.state.tick
    }
    pub fn match_over(&self) -> bool {
        self.state.match_over
    }
    pub fn winner(&self) -> i32 {
        self.state.winner
    }
    pub fn round_ticks(&self) -> i32 {
        self.state.cfg.round_ticks
    }
    pub fn sudden_death_tick(&self) -> i32 {
        self.state.cfg.sudden_death_tick
    }

    /// FNV-1a 64 state fingerprint (BigInt in JS).
    pub fn hash(&self) -> u64 {
        hash::state_hash(&self.state)
    }

    pub fn snapshot(&self) -> Vec<u8> {
        hash::encode(&self.state)
    }

    /// Replace the state from a snapshot; false (state untouched) if the bytes are invalid.
    pub fn restore(&mut self, bytes: &[u8]) -> bool {
        match hash::decode(bytes) {
            Some(s) => {
                self.map = map::by_id(s.cfg.map);
                self.state = s;
                true
            }
            None => false,
        }
    }

    /// Fill `out` (length `view_len()`) with the render view.
    pub fn view(&self, out: &mut [i32]) {
        view::write(&self.state, out);
    }

    /// Platforms as [x, y, w, h] px quads (non-empty only), for the renderer's terrain bake.
    pub fn platforms(&self) -> Vec<i32> {
        self.map.platforms.iter().filter(|p| !p.is_empty()).flat_map(|p| [p.x >> 8, p.y >> 8, p.w >> 8, p.h >> 8]).collect()
    }

    pub fn weapon_spawns(&self) -> Vec<i32> {
        self.map.weapon_spawns.iter().flat_map(|p| [p.x >> 8, p.y >> 8]).collect()
    }
}

#[wasm_bindgen]
pub fn view_layout() -> Vec<i32> {
    vec![view::VIEW_VERSION, view::HEADER as i32, view::PLAYER_STRIDE as i32, view::PROJECTILE_STRIDE as i32, view::PICKUP_STRIDE as i32, view::LEN as i32]
}

/// Headless all-bot round → [winner, ticks, kills×4, died_at×4, health×4, hash_hi, hash_lo].
#[wasm_bindgen]
pub fn run_bot_round(seed: u32, map_id: u8, difficulties: &[i32]) -> Vec<i32> {
    let o = runner::run_bot_round(seed, map_id, difficulties);
    let mut out = vec![o.winner, o.ticks];
    out.extend(o.kills.iter().map(|&k| k as i32));
    out.extend(o.died_at.iter());
    out.extend(o.health.iter());
    out.push((o.final_hash >> 32) as u32 as i32);
    out.push(o.final_hash as u32 as i32);
    out
}

/// Back-a-Bird class of slot 0 for a bank seed (the backed hero is always drawn into slot 0).
#[wasm_bindgen]
pub fn back_bird_class(seed: u32, map_id: u8, difficulties: &[i32]) -> u8 {
    let o = runner::run_bot_round(seed, map_id, difficulties);
    runner::classify_back_bird(&o, 0, difficulties.len().min(MAX_PLAYERS))
}
