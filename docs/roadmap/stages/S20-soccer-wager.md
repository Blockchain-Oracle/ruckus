# S20 Soccer wager: "Call the Finish"

**Goal:** a novel Egg Soccer casino round (ADR-001's "bet on a VRF-seeded bot match", with a real decision) that passes the novelty check.

**Read first:** docs/research/deep/eggy-league.md, ADR-001/003/004/006, docs/competitors.md, PLAN §6b

## Design
**The round:**
1. **Call the Finish** in the hub opens a call sheet over a lined-up 2v2.
2. You call **how 20 seconds of golden goal ends**:
   - Pick a team: Tomato, Either or Violet.
   - Pick a finish: Any goal, Shot, Header, Off the bar (crossbar or roof), or No goal.
   - The sheet shows the chance and the payout live.
3. **Call it** opens a session with one of 13 bet types (5–17). params are empty, because the call *is* the bet type.
4. VRF settles **make** or **miss**.
5. Presentation, as in ADR-001 §4:
   - `finishPresentation` uses keccak(randomness ‖ "finish") to pick which finish shows, weighted by the declared table, among the finishes the outcome allows.
   - It takes a seed from `soccer-finish.v1.json` (512 golden-goal matches per finish).
6. The bank match plays with the full presentation: slow motion, confetti, crowd, and GOAL!/NO GOAL call-outs. **Skip to the finish** fast-forwards.
7. The result card reads "CALLED IT!" or "NOT THIS TIME", says how it ended ("Violet scored with a header"), shows the payout, and offers Call again.

**The finish table** (twentieths, declared in `_finishCover` and mirrored in `FINISH_CLASSES`):

| Finish | Weight | Measured, 2v2 skill 70, 20 s golden goal, 3000 matches (Tomato / Violet) |
|---|---|---|
| Team · shot | 3 | 13.5% / 13.1% |
| Team · header | 3 | 16.1% / 13.6% |
| Team · off the woodwork | 2 | 12.4% / 9.0% |
| No goal | 4 | 22.3% |

- The weights are declared, not measured: payouts depend only on the contract table.
- They were chosen close to what the bots do, so presented matches look natural, and so that every call pays a whole multiplier: 192000 / cover is always an integer.

**Calls** (each exactly 96%):
- Team scores: 8/20, pays 2.4×
- Team · shot or header: 3/20, pays 6.4×
- Team · woodwork: 2/20, pays **9.6×** (the top)
- Either · shot or header: 6/20, pays 3.2×
- Either · woodwork: 4/20, pays 4.8×
- Any goal: 16/20, pays 1.2×
- No goal: 4/20, pays 4.8×

**Finish definition** (`FinishTracker`, shared by the miner, the CI bank test and the live presentation):
- **Off the woodwork:** the ball touched the crossbar or the roof since the last kick.
- **Header:** otherwise, the last touch met the ball above 0.45 of the egg's radius over its centre.
- **Shot:** anything else.
- **No goal:** 20 s of play pass without a goal.

## Novelty check (2026-09-25, against docs/competitors.md and the originals list)
- **ChessChuck** (bet White, Draw or Black on a real GM game), **TILT!**, **Chain Arena** and **W.ARENA** (back a contestant):
  - Our team-only calls overlap "back a side".
  - The headline is different: you call **how** the goal goes in (header, ground shot, off the crossbar or roof) in a physics head-soccer sim. That dimension exists in no entry.
- **Penalty-shootout casino games** (third-party providers): we have no kicker-vs-keeper corner pick. It's open play, 2v2, golden goal.
- **Clatter, Roll Call, Replay** ("call the count" or "call the ordering"): these are combinatorial counts. Ours is an event-type call on a physical match.
- Stake, Roobet and BC.Game originals: no sport-sim finish call.
- **Verdict: passes.**
  - The distinctive element is a finish call graded by a deterministic physics sim, where you watch the actual golden goal your VRF word chose.
  - The same egg-soccer world also runs the free skill arena, online rooms and lessons.

## Tasks
- [x] Contract: bet types 5–17 via `_finishCover`, `_makeMiss` at 96%, empty-params validation. Foundry: exact RTP for every call, top/bottom multipliers, fuzzed cap and reserve, bad params, unknown type. The parity vectors cover all 13 calls.
- [x] `@arena/casino-math`: `FINISH_CLASSES`, `FINISH_CALLS`, tables, vectors, `finishPresentation`.
- [x] `sim-soccer/golden.ts`: `goldenWorld`, `FinishTracker`, `finishOf`.
  - Bank miner (`pnpm -F @arena/sim-soccer mine-bank`): v1 scanned 5,444 matches, keccak `0x6f0a5a9e4a353a86940be518ca687d5825caef047ad4a3be61d98116a1ea1c53`.
  - CI test: every bank entry replays to its finish; a made call always shows a covered finish, and a missed call never does.
- [x] Client: store, calls, controller (settle → presentation → golden goal → result → reveal guard), FinishHud (fits every screen), hub button, skip, dev evidence `__ruckusFinish`.
- [x] Demo-mode run at 1280×720, 844×390 and 390×844: the call button is on screen, the played finish equals the promised one, and there are no errors.
- [x] Simulator e2e (`pnpm -F @arena/browser-checks soccer-finish`), up to the 9.6× woodwork call.
  - 2026-09-25 run: 43 settled rounds. Five opening calls came first (any goal: won 1.2×; off the woodwork: won 4.8×).
  - Then it chased Tomato · woodwork, which landed on round 43 and paid 9.6 tokens on a 1-token stake.
  - Every played finish equalled the promised one, every win showed a covered finish and every loss an uncovered one, and every payout matched to the wei. PASS.
- [x] Fixes found by the run:
  - Picking a team after "No goal" now returns the call to "Any goal". The team buttons had been dead.
  - "Skip to the finish" moved to bottom centre. The jam badge in the bottom-right corner swallowed taps on it.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
