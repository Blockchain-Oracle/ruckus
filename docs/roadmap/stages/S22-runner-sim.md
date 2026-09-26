# S22 Runner sim

**Goal:** a deterministic 3-lane runner using DAG Dasher's mechanics and tuning, rebuilt as a **same-seed ghost race**. One seed gives one course, and every runner in the room runs that same course.

**Read first:** docs/research/deep/kaspakinesis.md (§0.1 spec sheet, §1 rules, §11 multiplayer), ADR-001/003/004/006, PLAN §6b

## Design calls (session 5)
These are recorded here; they are not locked ADRs.
- **The race is a real race.** DAG Dasher's "progress" was block height, so both players finished together (research §9.1). Ours runs to a **finish distance**.
  - Speed ramps 15 → 40 u/s with *your own distance*, which is KK's ramp keyed to distance instead of blocks.
  - Hits (×0.5 for 1.5 s) and pickups (Speed ×1.5, Slow ×0.6) now change finishing time, so every dodge and every gamble matters.
- **The course is `f(seed)` and is generated whole at `newWorld`.** It is immutable, so snapshots carry only the runners and the course is rebuilt from the seed.
  - Coins and pickups are taken **per runner**. Ghosts never collide or steal.
- **Spawning follows KK's odds** (30 barrier / 10 platform / 35 coin / 15 pickup / 10 breathing room).
  - The 1.5 s cooldown becomes a distance gap: `max(15 u, baseSpeed(s) × 1.5 s)`. This is deterministic and gives the same rhythm as the reference.
  - Coins come as **lines of 1–5** (KK's unused `COIN_CLUSTER_SIZE`), which fills out a Subway-style rhythm.
- **Barrier grammar is kept verbatim:** cyan = jump, yellow = duck, red = move (unjumpable), purple = strict duck. The same 9 templates and the same rotation roll.
- **Coins are life:** a hit costs 10; a hit with fewer than 10 is a **wipeout**.
  - KK starts at 0 coins, so the first hit killed you (research §9.5). We start at **20**, which is two free hits.
- **Duck** is held (keys). Touch sends a timed 0.45 s duck (client side).
  - **Duck in the air is a slam** (fast drop), Subway-style, replacing KK's rejected input.
- **The end:** you finish at the line. The race ends when every runner is done, or 12 s after the first finisher.
  - **Ranking:** finishers by tick; everyone else by distance, then coins.
- **Coin momentum** (Mario Kart's coins): each coin carried adds 1% speed, up to 10 coins, so coins count in the race and a hit costs twice.
  - Without it, a probe showed Rookie and Legend bots finishing within 1 s of each other.
- **The road is busier:** a spawn every 1.1 s instead of KK's self-described "easy mode" 1.5 s.
- **Bots** read the next threat in their lane and react with skill-scaled delay and error. They use their own PRNG stream, so they never perturb the course.

## Tasks
- [x] `packages/sim-runner`: constants (KK numbers, derived), course generator, step (lanes, jump/slam, duck, platforms, barriers, coins, pickups, speed), ranking, bots, Float64 snapshots, hash
- [x] Tests: determinism with bots, snapshot continuation, the barrier grammar (each colour beaten only by its verb), platforms mount, wipeout rule, bots finish courses
- [x] Wire into turbo/verify (typecheck + test)

## Acceptance
- `pnpm -F @arena/sim-runner test` is green, and `pnpm verify` passes.
- Bots finish most courses, and finishing order follows skill.
  - Probe over 30 seeds: skill 10 / 40 / 70 / 100 → 6.5 / 2.5 / 1.2 / 0.2 hits per race; 111.7 / 109.2 / 108.0 / 107.1 s.
  - Wipeouts are rare, because coins come in at about 50 per race. Coins still matter through momentum.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
