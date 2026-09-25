# ADR-003: Vendoring the casino SDK, and our own pool engine (no GPL)

- Status: accepted (2026-09-25)

## Part A: `@chain/casino-sdk` vendoring
- **Context:**
  - `casino-sdk/` is a private npm-workspaces package that exports raw TypeScript (`./src/guest.ts`). The coinflip example consumes it via `file:../..`.
  - Under pnpm, a `link:` dependency would resolve `penpal` and `zod` from `casino-sdk/node_modules`. That folder only exists after an npm install, so it breaks on Vercel and in CI.
- **Decision:**
  - `packages/chain-casino-sdk` is published internally under the name `@chain/casino-sdk`.
    - It holds verbatim copies of `casino-sdk/src/{types,guest,host,bet-limits,manifest,index}.ts`.
    - It exports `.`, `./guest` and `./host`.
    - It depends on `penpal@^7.0.4` and `zod@^4.4.3`.
  - `pnpm sync:sdk` refreshes the copies, and a test byte-compares them with `casino-sdk/src`. This follows the SDK's own §8.1 vendoring guidance in `CHAIN_WTF_CASINO_GAMES.md`.
  - `casino-sdk/` stays npm-only, used for the simulator:
    - It is excluded from `pnpm-workspace.yaml`, which lists `apps/*`, `packages/*`, `convex` and `contracts` explicitly and never uses `**`.
    - It is also excluded from biome and turbo.
    - Its `node_modules` folder and lockfile are gitignored.

## Part B: Pool physics
- **Context:**
  - tailuge/billiards has the best browser pool physics, but it is GPL-3.0.
  - Our bundle includes the unlicensed Chain SDK, and the project may earn a 25% revenue share, so GPL is incompatible.
- **Decision:**
  - We write our own deterministic TypeScript engine (`packages/sim-pool`) from the published models: Han 2005 (friction), Alciatore (throw) and Mathavan 2010 (cushions).
  - We port from **pooltool** (Apache-2.0, with attribution in CREDITS).
  - Only `+ − × ÷ sqrt` are allowed inside a simulation step. There is no trigonometry, which is not bit-identical across engines, and no `Math.random`.
  - The step is fixed at 1/512 s.
  - We compare our engine against tailuge's live build as a black box only. We never read its code while writing ours.
