//! Headless full rounds: the seed-bank miner, `/verify` and attract-mode matches all call this, so
//! a seed always replays the identical fight everywhere.

use crate::bot::Bot;
use crate::constants::MAX_PLAYERS;
use crate::hash::state_hash;
use crate::map::{self, MapId};
use crate::state::{Config, Input, State};
use crate::step::step;

/// Hard stop well past any round's clock (+ linger), in case a rule change ever stalls a round.
pub const MAX_ROUND_TICKS: i32 = 60 * 60;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Outcome {
    pub winner: i32,
    pub ticks: i32,
    pub kills: [u32; MAX_PLAYERS],
    pub died_at: [i32; MAX_PLAYERS],
    pub final_hash: u64,
}

pub fn new_bots(seed: u32, difficulties: &[i32]) -> Vec<Bot> {
    difficulties.iter().enumerate().map(|(slot, &d)| Bot::new(seed, slot, d)).collect()
}

/// Run an all-bot round to `match_over`.
pub fn run_bot_round(seed: u32, map_id: MapId, difficulties: &[i32]) -> Outcome {
    let n = difficulties.len().clamp(2, MAX_PLAYERS) as u8;
    let map = map::by_id(map_id);
    let mut state = State::new(seed, Config::standard(n, map_id), &map);
    let mut bots = new_bots(seed, &difficulties[..n as usize]);
    let mut inputs = [Input::default(); MAX_PLAYERS];
    while !state.match_over && state.tick < MAX_ROUND_TICKS {
        for bot in bots.iter_mut() {
            inputs[bot.slot] = bot.think(&state, &map);
        }
        step(&mut state, &inputs, &map);
    }
    let mut died_at = [0; MAX_PLAYERS];
    for (i, d) in died_at.iter_mut().enumerate() {
        *d = state.players[i].died_at;
    }
    Outcome { winner: state.winner, ticks: state.tick, kills: state.score, died_at, final_hash: state_hash(&state) }
}
