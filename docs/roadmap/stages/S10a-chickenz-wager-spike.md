# S10a Chickenz wager spike (seed banks + novel wager design)

**Goal:** prove the whole money path early. That means:
- a seed-bank miner
- bank validation
- bank-driven presentation
- a novel Chickenz wager design (a watch-party exhibition).

**Read first:** ADR-001, ADR-004, `docs/competitors.md`, `docs/research/02-web3-game-hackathons.md` §C, `game-feel-audio-ux.md` §5

## Wager design: "Back a Bird"
- **Bet:** in the Chickenz cabinet, pick one of the 4 heroes (Ninja Frog, Mask Dude, Pink Man, Virtual Guy) and a stake, then press **Back a Bird**.
  - The contract's `BET_BACK_CHICKEN` settles it on VRF.
  - The four classes are fixed by the contract (RTP 96.00%, weights 1:4:5:10 of 20):

    | Class | Multiplier | Chance |
    |---|---|---|
    | Flawless win (won with full HP) | 6.0× | 5% |
    | Win | 2.8× | 20% |
    | Runner-up (the last bird to fall before the winner) | 0.4× | 25% |
    | Lose | 0× | 50% |

- **Presentation:** the VRF word picks a pre-mined exhibition seed for the drawn class:
  - `seed = bank.classes[class][uniform(keccak(randomness ‖ "present"), 512)]`
  - The backed hero is drawn into slot 0, and the other heroes fill the other slots.
  - The full 4-bird fight then plays out live on the real Chickenz engine, with the backed bird marked (a nameplate and halo).
  - Tap-to-skip jumps to the result.
  - The fight is the proof: anyone can re-run the seed through `run_bot_round` and get the identical fight (`/verify`).
- **Act 2 (waiting for VRF):**
  - The four birds line up on the pedestals under a "BETS CLOSED" banner.
  - A drumroll loop plays, and the music ducks toward silence.
  - Minimum suspense is 1.2 s.
- **Act 4 (payout):** the tier celebration from `@arena/fx` (loss, small, win, big), with coins flying to the gold balance pill.
- **Novelty check:**
  - Backing a fighter overlaps Chain Arena (a narrated d20 duel) and TILT! (a two-team joust animation).
  - Ours differs in four ways:
    1. The contest is a real, playable 4-player platform-shooter engine. The exhibition birds are the same bots you fight for free.
    2. It is a 4-way FFA that pays by *placing* (flawless, win, runner-up), not a binary winner.
    3. Every fight is a deterministic, replayable simulation identified by a published seed bank (hash below).
    4. In rooms it is a **watch party**: your round plays in the room for friends (S10b).
  - None of the Stake, Roobet or BC.Game originals is a simulated multiplayer shooter.

## Seed bank v1
- File: `packages/casino-math/seedbanks/chickenz-back-bird.v1.json`
- 512 seeds per class, mined from 19,700 rounds starting at seed `0x5EED0000`.
- 4 bots at difficulty 75; map is `seed % 3`; the backed slot is 0.
- **keccak256 = `0x193ea23cb4187ecc3ce1af273ee0a7c31b873b0c33797721755180ee68f58011`**
- Re-mine: `cargo run --release --example mine_back_bird -- <out>` (in `crates/chickenz-sim`)
- Validation: `packages/sim-chickenz/test/seedbank.test.ts` replays all 2,048 entries on the wasm build. It runs in CI with the other tests.

## Tasks
- [x] Class definition in the sim (`classify_back_bird`), exported through wasm
- [x] Miner (Rust example) and bank v1
- [x] `@arena/casino-math` presentation: `presentationIndex`, `presentationSeed`, `bankHash`
- [x] CI validation of every bank entry
- [ ] The Back a Bird flow in the hub (hero pick, stake, bridge `openSession`, suspense, reveal, live fight, payout tier), in demo mode and in the simulator
- [ ] Simulator e2e: bet → WAITING_RANDOMNESS → reveal → the presented fight's class equals the settled class

## Acceptance
- The wager design passes the novelty check.
- The contract class table and the casino-math tables match, with exact RTP.
- The miner produces bank v1.
- CI validates every bank entry.
- A wager plays out from VRF to bank seed to a deterministic bot match in the simulator.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
