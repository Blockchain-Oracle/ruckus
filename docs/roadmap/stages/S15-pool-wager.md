# S15 Pool wager: "Call Your Shot"

**Goal:** a novel 8-ball casino round that honours the player's own stroke while the VRF decides the result (ADR-001: a decision moment, then a VRF answer).

**Read first:** ADR-001, ADR-004, docs/competitors.md, docs/research/deep/8ball.md §7

## Design
**The round:**
1. You get a practice layout: 6 object balls, randomly placed.
2. You aim with the normal controls. The HUD reads the call live: which ball, which pocket, and a difficulty tier from real pool geometry (cut angle and total travel).
3. Before the bet, a seeded make-search checks that the call can actually go in near your stroke. If it can't, the call is refused and nothing is bet.
4. **CALL IT** places the round: `betType` = tier (1–4), `params` = (ball, pocket).
5. VRF decides **make** or **miss**.
6. The engine plays your own stroke with a hair of tremor:
   - The make stroke comes from the pre-check search, which is seeded by the table and the stroke.
   - A miss comes from a tremor search seeded by the VRF word, which prefers a jaw rattle near the called pocket.

**Tiers** (every tier pays exactly 96.00%, contract `_makeMiss`):

| Tier | Geometry | Make chance | Pays |
|---|---|---|---|
| Straight | cut < 12°, travel < 1.2 m | 3 in 4 | 1.28× |
| Cut | cut < 35°, travel < 2.1 m | 1 in 2 | 1.92× |
| Thin | cut < 60°, travel < 2.1 m | 1 in 4 | 3.84× |
| Long | anything harder | 1 in 10 | 9.6× |

The client reads the tier, and the contract trusts it. Every tier has the same EV, so choosing a tier can't be exploited.

**Honesty:** the HUD says "every call returns 96%". Nothing about aiming skill changes the result: the chain holds the cue, and your line is what it plays.

## Novelty check (2026-09-25, against docs/competitors.md)
- **DEADEYE** (a PSX shooting-range parlay: take a shot, push your multiplier or cash out):
  - Ours is a single call with no parlay or cash-out ladder.
  - The reveal is a physically simulated pool shot on a real 8-ball table.
- **LEDGE** (the paytable is the board you aim at; odds move as you bet; all spreads 96%):
  - This overlaps "odds move as you aim".
  - The difference: our price is real cue-sport difficulty (cut angle and travel on a physics table). What you aim is a real stroke, and it plays as a 3D shot with throw, spin and jaw rattles.
- **Clatter / Roll Call** ("call how many"): we have no count bet.
- Stake, Roobet and BC.Game originals: none is a cue-sport shot on a physics table.
- **Verdict: passes.** The distinctive element is that your own line and spin are honoured by a deterministic engine, and the VRF only supplies the tremor that decides make or miss.

## Tasks
- [x] Contract: four two-class tables, ball and pocket params validated, 96% exact. Foundry: RTP, fuzzed cap, bad params, parity vectors for every bet type.
- [x] `@arena/casino-math` mirror and vectors; the `encodeCallShotParams` codec.
- [x] `sim-pool/callshot.ts`: layout, `readCall`/tier, `findMake`, `findMiss` (the jaw-rattle preference), with tests.
- [x] Client: the wager mode, the live call bar, the power cue keeping its power, CALL IT, suspense, realise in the worker, play, result card, reveal guard.
- [x] Demo-mode run: bet → settle → realised stroke → result card.
- [x] Simulator e2e (`pnpm -F @arena/browser-checks pool-wager`), up to the 9.6× long-shot make.
  - 2026-09-25 run: 10 settled rounds and 5 refused (unmakeable) calls. Every stroke matched the settled class, and every payout matched to the wei. The long-shot make paid 9.6 tokens on a 1-token stake. PASS.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
