use chickenz_sim::bot::Bot;
use chickenz_sim::constants::MAX_PLAYERS;
use chickenz_sim::hash::{decode, encode, state_hash};
use chickenz_sim::map::{self, ARENA};
use chickenz_sim::runner::{run_bot_round, MAX_ROUND_TICKS};
use chickenz_sim::state::{Config, Input, State};
use chickenz_sim::step::step;

const DIFF: [i32; 4] = [60, 60, 60, 60];

#[test]
fn same_seed_same_round() {
    for n in 2..=4 {
        for seed in [1u32, 42, 0xDEAD_BEEF] {
            let a = run_bot_round(seed, ARENA, &DIFF[..n]);
            let b = run_bot_round(seed, ARENA, &DIFF[..n]);
            assert_eq!(a, b, "n={n} seed={seed}");
        }
    }
}

#[test]
fn every_round_finishes_with_a_winner() {
    for n in 2..=4 {
        for map_id in 0..map::MAP_COUNT {
            for seed in 0..60u32 {
                let o = run_bot_round(seed, map_id, &DIFF[..n]);
                assert!(o.ticks < MAX_ROUND_TICKS, "stalled n={n} map={map_id} seed={seed}");
                assert!((0..n as i32).contains(&o.winner), "no winner n={n} seed={seed}: {o:?}");
            }
        }
    }
}

/// With identical bots, no slot may be structurally favoured: spawns are shuffled per seed and
/// exact ties are drawn from the PRNG. Each slot should win roughly 1/n of rounds.
#[test]
fn wins_are_symmetric_across_slots() {
    const ROUNDS: u32 = 1200;
    for n in 2..=4usize {
        let mut wins = [0u32; MAX_PLAYERS];
        let mut decisive = 0;
        for seed in 0..ROUNDS {
            let o = run_bot_round(seed.wrapping_mul(2_654_435_761), ARENA, &DIFF[..n]);
            wins[o.winner as usize] += 1;
            if o.kills.iter().any(|&k| k > 0) {
                decisive += 1;
            }
        }
        let expected = ROUNDS as f64 / n as f64;
        for (slot, &w) in wins.iter().enumerate().take(n) {
            let dev = (w as f64 - expected).abs() / expected;
            assert!(dev < 0.15, "n={n} slot {slot} won {w} of {ROUNDS} (expected ~{expected:.0}): {wins:?}");
        }
        // Bots must actually fight, not just run out the clock.
        assert!(decisive * 2 > ROUNDS, "n={n}: only {decisive}/{ROUNDS} rounds had a kill");
        println!("n={n} wins={:?} rounds-with-kills={decisive}", &wins[..n]);
    }
}

#[test]
fn snapshot_round_trip_and_resume() {
    let m = map::arena();
    let mut state = State::new(7, Config::standard(4, ARENA), &m);
    let mut bots: Vec<Bot> = (0..4).map(|s| Bot::new(7, s, 70)).collect();
    let mut inputs = [Input::default(); MAX_PLAYERS];
    let mut run = |state: &mut State, bots: &mut Vec<Bot>, ticks: i32| {
        for _ in 0..ticks {
            for b in bots.iter_mut() {
                inputs[b.slot] = b.think(state, &m);
            }
            step(state, &inputs, &m);
        }
    };
    run(&mut state, &mut bots, 400);
    let bytes = encode(&state);
    let restored = decode(&bytes).expect("decodes");
    assert_eq!(state_hash(&state), state_hash(&restored));

    let (mut a, mut b) = (state.clone(), restored);
    let (mut bots_a, mut bots_b) = (bots.clone(), bots);
    run(&mut a, &mut bots_a, 600);
    run(&mut b, &mut bots_b, 600);
    assert_eq!(state_hash(&a), state_hash(&b));
    assert!(decode(&bytes[..bytes.len() - 1]).is_none(), "truncated snapshot must be rejected");
}

/// Golden values shared with the wasm Vitest suite: native and wasm must agree bit for bit.
#[test]
fn golden_outcome() {
    let o = run_bot_round(1234, ARENA, &DIFF);
    println!("GOLDEN seed=1234 n=4 winner={} ticks={} hash={:#018x}", o.winner, o.ticks, o.final_hash);
}

#[test]
fn back_bird_class_rates() {
    use chickenz_sim::runner::classify_back_bird;
    let mut counts = [0u32; 4];
    for seed in 0..4000u32 {
        let o = run_bot_round(seed, (seed % 3) as u8, &[75, 75, 75, 75]);
        counts[classify_back_bird(&o, 0, 4) as usize] += 1;
    }
    println!("BACK_BIRD slot0 classes over 4000: flawless/win/second/lose = {counts:?}");
    assert!(counts.iter().all(|&c| c > 0));
}
