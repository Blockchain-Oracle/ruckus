# S06 Chickenz sim (Rust, 4-player FFA, deterministic bots)

**Goal:** extract `crates/chickenz-sim` from `fp.rs`, generalise it to N ≤ 4, port BotAI deterministically, and ship wasm for the browser and Node.

**Read first:** ADR-005; `docs/research/deep/chickenz.md` §1, §2, §5 and §6; `references/chickenz/services/prover/core/src/fp.rs`; `services/prover/wasm/src/lib.rs`; `services/server/src/BotAI.ts`

## Design calls (made at stage start, 2026-09-25)
- **The sim is frozen at the end of this stage.** S10a mines seed banks from it, so any rule change afterwards invalidates the banks. Every feel change that touches rules therefore goes in now:
  - **Coyote time** (6 ticks) and a **jump buffer** (6 ticks). These are forgiveness only: trajectories are unchanged.
  - **Hit knockback**, per weapon (small for pistol and SMG, big for sniper and rocket).
  - **No variable jump height.** Bots tap jump for one tick, and the original tuning is a full-height jump.
- **FFA rules:**
  - Last bird standing wins.
  - Time-up ranks by lives, then HP, then kills.
  - Remaining exact ties, and zone double-kills (ranked by kills), go to a **seeded PRNG draw among the tied players**. This is symmetric, unlike the original's player-0 rule.
  - Spawn points are shuffled per seed, so slot order never maps to a fixed spawn.
  - Round length scales with player count: 30 s for 2P, 35 s for 3P, 40 s for 4P. Sudden death starts 10 s before the end.
- **Bots:**
  - Each bot owns a PRNG stream (Mulberry32, the same function as the sim), seeded from the match seed and its slot. Bots read the state and never mutate it, so a client can predict without running bots.
  - Integer maths only, with an integer square root.
  - FFA targeting: nearest living opponent, with hysteresis.
- **wasm API:** no per-tick JSON.
  - Packed input bytes in.
  - A flat `Int32Array` render view out.
  - A binary snapshot and restore for rollback.
  - An FNV-1a 64-bit state hash.
  - `run_bot_match` for the seed-bank miner.

## Tasks
- [ ] Crate skeleton: `crates/chickenz-sim` (fixed-point, constants, weapons, maps, prng, state, physics, stomp, projectiles, step, bot, hash). Add `rust-toolchain.toml`, NOTICE (MIT), and the CREDITS entry.
- [ ] Generalise to N ≤ 4 (players array plus count, stomp across any pair, FFA elimination, symmetric tie-break, spawn shuffle)
- [ ] Feel additions (coyote, jump buffer, knockback) as constants with units
- [ ] Deterministic bot port (difficulty 0–100, dodge, platform nav, pickups, FFA targeting, stomp escape)
- [ ] Rust tests: determinism (same seed and inputs give the same hash), 2/3/4-player bot matches finish, tie-break symmetry, snapshot round-trip
- [ ] wasm bindings behind a `wasm` feature; wasm-pack `--target web` into `packages/sim-chickenz/pkg` plus `SOURCE_HASH`
- [ ] `packages/sim-chickenz` TS wrapper (typed input packing, render view decoding, `initSync` for Node)
- [ ] Vitest: the wasm hash equals the native golden hash; bot match determinism in Node
- [ ] CI: SOURCE_HASH check; turbo `wasm` task

## Acceptance
- The same seed and inputs give an identical per-tick state hash in Node and the browser (Vitest).
- 2-, 3- and 4-player matches run with bots.
- The tie-break is symmetric.
- `pkg/` and SOURCE_HASH are committed.
- CI checks SOURCE_HASH, and turbo has a wasm task.
- Constants are documented with units.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
