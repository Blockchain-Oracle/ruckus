# S25 Runner wager: "Call the Wipeout"

**Goal:** a novel Neon Dash casino round (ADR-001's "bet on a VRF-seeded bot run", with a real decision) that passes the novelty check. Not crash, and not a cash-out ladder.

**Read first:** docs/research/deep/kaspakinesis.md, ADR-001/003/004/006, docs/competitors.md, PLAN §6b

## Design
**The round:**
1. **Call the Wipeout** in the hub opens a call sheet over a runner on a gauntlet's start line.
2. The runner takes on a 520 m all-barrier neon gauntlet **with no coins, so the first hit ends the run**. That is DAG Dasher's original rule (start at 0 coins), which the free race softened.
3. You call **what stops them**:
   - the barrier colour they fail: cyan (jump), yellow (duck), red (dodge) or purple (strict duck)
   - **Any wipeout**
   - a **Clean run** to the line
4. **Call it** opens a session with one of 6 bet types (18–23). params are empty, because the call *is* the bet type.
5. VRF settles **make** or **miss**.
6. Presentation (ADR-001 §4):
   - `wipeoutPresentation` uses keccak(randomness ‖ "wipeout") to pick which ending shows, weighted by the declared table, among the endings the outcome allows.
   - It takes a seed from `runner-wipeout.v1.json` (512 gauntlets per ending).
7. The bank gauntlet plays in full: the neon road, the verb-coloured barriers, the tumble with sparks, or the finish gantry.
   - A WIPEOUT! or CLEAN RUN! call-out, then the result card ("Wiped out on a yellow duck bar").
   - **Skip to the end** fast-forwards.

**The ending table** (twentieths, declared in `_wipeoutCover`, mirrored in `WIPEOUT_CLASSES`):

| Ending | Weight | Measured (gauntlet bot skill 55, 6,000 runs) |
|---|---|---|
| Fails a jump (cyan) | 5 | 27.3% |
| Fails a duck (yellow) | 6 | 27.7% |
| Fails a dodge (red) | 3 | 12.1% |
| Fails a strict duck (purple) | 2 | 9.6% |
| Clean run | 4 | 23.3% |

- The weights are declared, not measured: payouts depend only on the contract table.
- They sit close to what the gauntlet bot does, so presented runs look natural. Every cover divides 192000, so every call pays a whole multiplier.
- The gauntlet (`packages/sim-runner/src/gauntlet.ts`):
  - starts at 1,200 m on the speed ramp (~25 m/s)
  - one barrier from the race's templates every 0.9 s
  - about 13 s long

**Calls** (each exactly 96%):

| Call | Chance | Pays |
|---|---|---|
| Any wipeout | 16/20 | 1.2× |
| Duck (yellow) | 6/20 | 3.2× |
| Jump (cyan) | 5/20 | 3.84× |
| Clean run | 4/20 | 4.8× |
| Dodge (red) | 3/20 | 6.4× |
| Strict duck (purple) | 2/20 | **9.6×** (top) |

## Novelty check (2026-09-26, against docs/competitors.md and the originals list)
- **Crash, cash-out and survive ladders** (Lazer crash, Tug, fracture, Deadman Drift's 5-stage cascade, Genie's Vault): each grows a multiplier while you survive and asks when to bank. Ours has **no ladder and no cash-out**: one call, one run, one settled ending.
- **Midnight Run** (neon city, pick a route to escape a patrol): the theme is similar, but the mechanic is a route pick against a patrol path. Ours is a call on *which verb fails* in a deterministic runner sim.
- **Back-a-contestant** (Chain Arena, W.ARENA, TILT!, our own Back a Bird): there's no contestant to pick. Everyone watches the same lone runner; the call is the failure mode.
- **Call-the-count / ordering** (Clatter, Roll Call, Replay): ours is a single categorical ending, not a count.
- Stake, Roobet and BC.Game originals: no runner and no obstacle-verb call.
- **Verdict: passes.**
  - The headline is the **colour-is-the-verb grammar turned into the bet**: you learn the colours by racing for free, then call which one beats the runner.
  - It uses the same world as the free race, online rooms and "beat my run" links.

## Tasks
- [x] Contract: bet types 18–23 via `_wipeoutCover`, `_makeMiss` at 96%, empty params. Foundry: exact RTP for every call, each multiplier, fuzzed cap and reserve, bad params, unknown type past 23, parity vectors for all six.
- [x] `@arena/casino-math`: `WIPEOUT_CLASSES`, `WIPEOUT_CALLS`, tables, vectors, `wipeoutPresentation`. `finishPresentation` and `wipeoutPresentation` share one `coverPresentation` under separate domains.
- [x] `@arena/casino-math` `bankHash` hashes canonical (compact) JSON, and the Chickenz, Soccer and Runner bank tests pin their hashes. Soccer's first published hash had been taken before Biome reformatted the file.
- [x] `sim-runner`:
  - `gauntlet.ts`: `buildGauntlet`, `gauntletWorld`, `wipeoutOf`, `runWipeout`
  - `finishM` on the world
  - the wipeout event carries its barrier
  - Bank miner `pnpm -F @arena/sim-runner mine-bank`: v1 scanned 5,479 runs. Canonical keccak `0x7f4bed641061c0e38dcb7c7b38d03f4f60ce08375c3b4879277450095023c30a`.
  - CI test: every bank entry replays to its ending; made calls always show a covered ending, missed calls never do.
- [x] Client:
  - store, calls, controller (settle → presentation → gauntlet → result → reveal guard)
  - WipeoutHud: six colour tiles that fit every screen
  - hub button, skip, and the `__ruckusWipeout` dev evidence
- [x] Demo-mode run at 1280×720, 844×390 and 390×844: the played ending equals the promised one, with no errors. Fixed: a wiped-out runner blinked forever (its invulnerability timer never ran down once out).
- [x] Simulator e2e (`pnpm -F @arena/browser-checks runner-wipeout`, simulator on :3300 after `pnpm -F @arena/contracts sync` and a restart):
  - 2026-09-26 run: 18 settled rounds. Five opening calls came first (clean run: won 4.8×). Then it chased purple, which landed on round 18 and paid exactly 9.6 tokens on a 1-token stake.
  - Every played ending equalled the promised one, and every payout matched to the wei. PASS.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
