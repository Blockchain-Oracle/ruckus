# ADR-005: Chickenz stays a Rust sim, generalized to 4-player FFA

- Status: accepted (2026-09-25)
- Context:
  - Chickenz's proven sim is `references/chickenz/services/prover/core/src/fp.rs`. It is MIT-licensed, uses i32 fixed-point maths with 8 fractional bits, and runs a pure `step_mut(&mut State, &[Input;2], &Map)`.
  - It is compiled to WASM with wasm-bindgen and runs the same code in the browser and on the server.
  - The tech-stack research recommended pure TypeScript sims. The user chose full Chickenz fidelity and **4-player FFA**.

## Decision
- **Extract `crates/chickenz-sim` from `fp.rs` only**, with MIT attribution in `NOTICE` and `docs/CREDITS.md`.
  - Remove the ZK and proof helpers.
  - Remove the legacy f64 modules.
  - Replace the risc0 `sha2` git fork with crates.io `sha2`, or an FNV state hash for the determinism tests.
- **Generalize from 2 players to N ≤ 4:**
  - `players: [Player; MAX_PLAYERS]` plus an active count.
  - Spawns for 4.
  - Stomp and ride work between any pair of players.
  - Hits and projectiles work across all players.
  - Camera-framing data covers every player.
  - A **symmetric tie-break**, replacing the original's creator-wins rule. That rule is an unfair edge.
  - 1v1 is simply N=2.
- **Port `services/server/src/BotAI.ts` into the crate as a deterministic fixed-point bot policy.**
  - It uses the sim's own PRNG. The original uses `Math.random`, which isn't reproducible.
  - It is exported through wasm, so the client, the server, the seed-bank miner and `/verify` all run the identical policy.
  - Bots are always labelled. None of Chickenz's fake rooms, disguised bots or rubber-banding are ported.
- **Build and delivery:**
  - wasm-pack with `--target web`, loaded with `init()` in the browser and `initSync()` in Node.
  - Pinned in `rust-toolchain.toml`.
  - `pkg/` is committed along with `SOURCE_HASH` (see ADR-002).

## Why Rust over a TypeScript port
- The existing sim is proven, tuned and already deterministic in fixed-point.
- Porting it would risk losing the game feel, which is what the user values most.
