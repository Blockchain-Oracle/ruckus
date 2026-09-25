# S06 Chickenz sim (Rust, 4-player FFA, deterministic bots)

> STUB — expand into a detailed task checklist (like S01–S05) when this stage becomes active.

**Goal:** Extract crates/chickenz-sim from fp.rs, generalize to N≤4, port BotAI deterministically, ship wasm for browser+node.

**Read first:** ADR-005, docs/research/deep/chickenz.md §1,2,5,6, references/chickenz/services/prover/core/src/fp.rs, services/prover/wasm/src/lib.rs, services/server/src/BotAI.ts

## Tasks
- [ ] (expand at stage start)

## Acceptance
Same seed+inputs → identical per-tick state hash in Node & browser (Vitest); 2/3/4-player matches run with bots; symmetric tie-break; pkg/ + SOURCE_HASH committed; CI SOURCE_HASH check + turbo wasm task; constants documented with units.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
