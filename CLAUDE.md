# RUCKUS: a multiplayer party arena for Chain Jam Vol. 1

This is a premium, GamePigeon-style multiplayer arena. It has four games, each adapted from a reference:
- **Chickenz**: a 4-player free-for-all platform shooter. This is the flagship.
- **8-ball pool**
- **Head-soccer** (after Eggy League)
- **A 3-lane runner** (after KaspaKinesis)

**How it fits the jam:**
- Skill play is free and earns points and rank only.
- Money moves only through VRF-settled `ICasinoGameV2` wager rounds.
- The jam is at jam.chain.wtf. Submissions close on Sun Sep 27 2026 at 23:59 UTC.
- **The user has decided the deadline is never a reason to cut quality.**

## ⚠️ Session protocol: read this first, every session
1. Read `docs/roadmap/HANDOFF.md`. It says where we are and gives the **NEXT ACTION**.
2. Open the active stage file in `docs/roadmap/stages/`. Read only the inputs listed under "Read first".
3. While you work:
   - Tick the task boxes in the stage file.
   - Make one Conventional Commit per task, using the package as the scope, e.g. `feat(sim-chickenz): …`.
4. Before a pause or a context clear, run the stage's **exit checklist**:
   1. The verify commands pass.
   2. `ROADMAP.md` statuses are updated.
   3. `HANDOFF.md` is rewritten, including the exact NEXT ACTION.
   4. One line is added to `LOG.md`.
   5. Everything is committed.
5. Scope lives in `docs/roadmap/PLAN.md` (the approved plan). Decisions live in `docs/decisions/ADR-*.md`. Never re-argue a locked decision without the user.
6. Stages marked ✱ need the user. Always ask before any outward-facing action: creating a repo, deploying, buying something, submitting, or sending anything.

## Layout
```
apps/web            Vite 8 + React 19 + R3F 9 (hub, games, features)
apps/server         Colyseus 0.18 (Coolify + Nixpacks, apps/server/nixpacks.toml)
convex/             Convex (anonymous auth, leaderboards, tournaments, replays)
contracts/          Foundry; <Name>Game.sol, a class-table ICasinoGameV2 contract; synced into casino-sdk/simulator/contracts/
crates/chickenz-sim Rust fixed-point sim (from Chickenz fp.rs, MIT), N≤4, deterministic bots → wasm
packages/*          tsconfig, shared, protocol, netcode, chain-casino-sdk (vendored), casino-bridge,
                    casino-math, sim-*, audio, fx, assets-pipeline
tooling/            biome grit rules, prod-frame sandbox harness, seedbank-miner
docs/               requirements, research (deep/), roadmap/, decisions/, assets/, CREDITS.md
casino-sdk/         vendored Chain SDK + local simulator (npm only; NOT in the pnpm workspace)
references/         cloned reference games (gitignored, read-only; never copy GPL tailuge code)
```

## Engineering standards (details: PLAN.md §5, docs/research/deep/monorepo-blueprint.md)
- **Toolchain:**
  - pnpm **10.x** is pinned. Nixpacks only supports pnpm 10, and a local pnpm 11 auto-switches.
  - Node ≥24.12.4.
  - Turborepo, Biome 2, and TypeScript 7 (subject to the S00b spike).
  - Vitest and Foundry for tests.
- **TypeScript:**
  - `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`.
  - **No enums and no decorators.** Use `as const` and the Colyseus `schema()` builder instead.
- **Imports:**

  | Where | Style |
  |---|---|
  | Across packages | `@arena/*` only |
  | Inside `apps/web` | `@/…` |
  | Inside the server | `#app/…` |
  | Inside a game | relative only |

  **Games never import each other.** Biome sorts imports.
- **Sims must be deterministic:**
  - `packages/sim-*` and `crates/*` never import three, react, the DOM, `node:*`, audio or fx.
  - Never use `Math.random`, `Date.now`, `performance.now` or timers. A lint rule enforces this.
  - Bots live inside the sim and use its PRNG.
- **No magic numbers:**
  - Sim tuning lives in `constants.ts`, with units in the names and values derived from each other.
  - Tables are written `as const satisfies Record<Id, Stats>`.
  - Visual tuning lives in `games/<game>/config.ts`.
  - Env vars are validated with t3-env + zod.
- **Size and style:**
  - Keep files to roughly 300–400 lines and split them into systems. Chickenz's 2.3k-line `GameScene` shows what not to do.
  - Comments explain *why*, not *what*.
  - Handle errors at the boundaries.
- **Tests are for complex logic only:** RTP and payout parity, sim and bot determinism, seed banks, netcode, SDK sync. **No UI tests.**
- **UI components come from 21st.dev** (skills: `21st-cli-use`, `21st-ui-build`, `21st-ui-explore`). Don't hand-roll mediocre UI. UX, sound, motion and physics feel are the product.
- **Read a library's docs before using it** (context7).

## Casino rules: hard requirements for jam eligibility (pass/fail)
- **Implement the SDK exactly.** The contract implements `ICasinoGameV2`. The frontend talks to the host only through the `@chain/casino-sdk` bridge, with no wallet code. `game.manifest.json` is served same-origin, with `gameId` = the canonical id.
- **Outcomes come from VRF only** (ADR-001):
  - The contract draws an outcome **class** using uint256 rejection sampling. Never `% n` on raw bytes, and never `Math.random`.
  - The client only *presents* the drawn class, using seed banks.
- **RTP and payouts** (ADR-004):
  - Every bet type pays exactly the single declared RTP, which must be between 93% and 98%.
  - One `_payout()` function feeds `quoteCaps`, `quoteRiskParams`, `onSessionStart` and `onRandomness`.
  - `reservedProfitDelta = 0` on the settling step.
- **Standalone demo:** with no host (either `window.parent === window`, or a handshake timeout of about 3 s), boot `DemoHost`, a labelled "DEMO credits, no value" mode.
- **Jam widget:** the page HTML must include `<script async src="https://jam.chain.wtf/widget.js"></script>`, plus a 1200×630 og:image. Send no frame-blocking headers.
- **Novelty:** no classic casino games and no plinko/dice/limbo/crash/mines clones. Every wager passes the novelty check in ADR-001.
- **Simulator:** `cd casino-sdk && npm install && npm start`, then open the harness at :3300. Nothing counts as done until a full bet → WAITING_RANDOMNESS → reveal → payout loop works there, including the top multiplier.

## Assets (ADR-006, docs/research/deep/asset-sources.md)
- **Look:** one shared brand across the hub, with each game in its native style.
- **Licences:** only licences that allow real-money gambling use. Every asset goes in `docs/CREDITS.md`.
- **ElevenLabs is the primary source for sound effects and music.** Use the `sound-effects` and `music` skills, or the `elevenlabs` CLI. The budget is 39,855 credits per month on the Starter plan. Raw takes go in `assets-src/`.

## Judging (unweighted)
Novelty · Fun (still fun after 10h?) · Simplicity (no manual needed) · Visual & sound (no AI slop).
