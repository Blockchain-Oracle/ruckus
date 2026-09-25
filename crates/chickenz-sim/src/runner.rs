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
    pub health: [i32; MAX_PLAYERS],
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
    let mut health = [0; MAX_PLAYERS];
    for i in 0..MAX_PLAYERS {
        died_at[i] = state.players[i].died_at;
        health[i] = state.players[i].health;
    }
    Outcome { winner: state.winner, ticks: state.tick, kills: state.score, died_at, health, final_hash: state_hash(&state) }
}

/// "Back a Bird" outcome classes, in contract order (RuckusGame `BET_BACK_CHICKEN`).
pub const BACK_FLAWLESS: u8 = 0;
pub const BACK_WIN: u8 = 1;
pub const BACK_SECOND: u8 = 2;
pub const BACK_LOSE: u8 = 3;

/// How the backed slot finished: won untouched, won, outlasted everyone but the winner, or less.
pub fn classify_back_bird(o: &Outcome, slot: usize, player_count: usize) -> u8 {
    if o.winner == slot as i32 {
        return if o.health[slot] >= crate::constants::MAX_HEALTH { BACK_FLAWLESS } else { BACK_WIN };
    }
    // Runner-up = the last loser to fall. Two losers on the same tick share it only if the backed
    // bird is one of them and nobody fell later, so ties can't make "2nd" ambiguous in the bank.
    let mut last = -1;
    let mut last_count = 0;
    for i in 0..player_count {
        if i as i32 == o.winner {
            continue;
        }
        let d = o.died_at[i];
        if d > last {
            last = d;
            last_count = 1;
        } else if d == last {
            last_count += 1;
        }
    }
    if o.died_at[slot] == last && last_count == 1 {
        BACK_SECOND
    } else {
        BACK_LOSE
    }
}
