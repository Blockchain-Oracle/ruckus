//! Seed-bank miner for "Back a Bird" (ADR-001). Scans seeds in order and keeps the first K per
//! outcome class of slot 0. Output is the bank JSON consumed by `@arena/casino-math`.
//!
//! cargo run --release --example mine_back_bird -- <out.json>

use chickenz_sim::map::MAP_COUNT;
use chickenz_sim::runner::{classify_back_bird, run_bot_round};

const BANK_VERSION: u32 = 1;
const K: usize = 512;
const CLASSES: usize = 4;
const PLAYERS: usize = 4;
/// Every exhibition bird is equally skilled, so the drawn class, not the matchup, decides.
const DIFFICULTY: i32 = 75;
/// Seeds are scanned from here; the constant is published so anyone can re-mine the bank.
const FIRST_SEED: u32 = 0x5EED_0000;

fn main() {
    let out = std::env::args().nth(1).expect("usage: mine_back_bird <out.json>");
    let difficulties = [DIFFICULTY; PLAYERS];
    let mut banks: [Vec<u32>; CLASSES] = Default::default();
    let mut seed = FIRST_SEED;
    let mut scanned = 0u32;
    while banks.iter().any(|b| b.len() < K) {
        let map_id = (seed % MAP_COUNT as u32) as u8;
        let o = run_bot_round(seed, map_id, &difficulties);
        let class = classify_back_bird(&o, 0, PLAYERS) as usize;
        if banks[class].len() < K {
            banks[class].push(seed);
        }
        seed = seed.wrapping_add(1);
        scanned += 1;
    }
    let classes: Vec<String> = banks
        .iter()
        .map(|b| format!("[{}]", b.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(",")))
        .collect();
    let json = format!(
        "{{\n  \"version\": {BANK_VERSION},\n  \"game\": \"chickenz\",\n  \"betType\": 0,\n  \"players\": {PLAYERS},\n  \"difficulty\": {DIFFICULTY},\n  \"mapRule\": \"seed % {MAP_COUNT}\",\n  \"backedSlot\": 0,\n  \"firstSeed\": {FIRST_SEED},\n  \"scanned\": {scanned},\n  \"perClass\": {K},\n  \"classes\": [\n    {}\n  ]\n}}\n",
        classes.join(",\n    ")
    );
    std::fs::write(&out, json).expect("write bank");
    eprintln!("mined {K}×{CLASSES} seeds from {scanned} rounds → {out}");
}
