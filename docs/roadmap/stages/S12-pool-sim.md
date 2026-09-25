# S12 Pool sim

**Goal:** a deterministic TypeScript 8-ball engine built from the published models (ADR-003 B).
- Only + − × ÷ sqrt, enforced by the `tooling/biome/exact-math.grit` lint.
- Fixed 1/512 s step.
- pooltool (Apache-2.0) is the porting reference.

**Read first:** docs/research/deep/8ball.md, ADR-001/003/004/006, PLAN §6b

## Tasks
- [x] `packages/sim-pool` scaffold. Constants carry SI units, and derived values are computed.
- [x] Motion: Han 2005 sliding, rolling and spinning friction, closed-form within each phase, with an exact snap to rolling when slip closes (`motion.ts`).
- [x] Exact time of impact inside each step for ball-ball, rail segments and knuckles (`collide.ts`). Events are processed in time order (`engine.ts`).
- [x] Ball-ball: pooltool frictional-inelastic with Alciatore throw. `expDet` is a fixed polynomial exp.
- [x] Touching clusters (the rack, frozen combinations) are solved simultaneously: projected Gauss-Seidel, 40 sweeps.
- [x] Cushions: the Han 2005 port; knuckles use the same model with a point normal.
- [x] Table: an 8 ft 2:1 table. Corner mouth 11.8 cm (throat 9.8), side mouth 13 cm (throat 11). Jaw facings narrow into the throat. The drop point is 1R past the nose.
- [x] Cue: the TP A-30 instantaneous strike (level cue) plus TP A-31 squirt, via a sqrt-only rotation.
- [x] Rack: WPA 8-ball order, seeded shuffle, 0.1 mm per-ball jitter.
  - Tuned so a 0.9-power centre break averages about 1.1 balls potted and spreads the rack widely (30 seeds).
- [x] 8-ball rules (`rules.ts`):
  - Open table; the first clean pot assigns groups.
  - Fouls give ball in hand: scratch, no hit, wrong ball, no rail.
  - Call the pocket for the 8. The 8 early, in the wrong pocket or on a foul loses. An 8 on the break is respotted.
- [x] Tests:
  - Determinism, stun, follow/draw, rolling distance = v²/2μg, rail rebound, and legal break settling.
  - Rules verdicts.
  - Performance: about 59 ms per full break headless, after the broad phase.
- [ ] Bot: ghost-ball candidates, then a simulated search with execution noise per difficulty. Runs in a Worker (S14 wires rooms).
- [ ] Black-box comparison against tailuge's live build on a few canonical shots: stun, follow, draw, a cut angle, a bank (to do alongside S13 visuals).

## Acceptance
- Deterministic replay of any shot.
- Physically plausible feel on the canonical shots.
- Rules match online 8-ball conventions.
- Fast enough for a searching bot.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
