# S00b: Toolchain and monorepo skeleton

**Goal:** a monorepo that follows best practice, lints and typechecks cleanly, deploys with Nixpacks, and runs CI. No product code yet.

**Read first:**
- `PLAN.md` §4 (tree), §5 (standards), §6 (deploy)
- ADR-002 and ADR-003
- `docs/research/deep/tech-stack.md` §7
- **`docs/research/deep/monorepo-blueprint.md`** (the full best-practice reference)
- **`docs/research/deep/coolify-nixpacks.md`**

## Tasks
1. [ ] **Root `package.json`**
   - `"private": true`
   - `packageManager: "pnpm@10.<latest>"`: check the latest 10.x with `npm view pnpm@10 version`
   - `engines.node: "24.x"`
   - scripts: `dev`, `build`, `typecheck`, `check`, `test`, `sync:sdk`, `contracts:sync`
2. [ ] **`pnpm-workspace.yaml`**
   - explicit `packages: [apps/*, packages/*, convex, contracts]`; never `**`, and never include `casino-sdk`
   - `catalog:` for react, three, zod and typescript
   - `onlyBuiltDependencies` for anything that needs install scripts
3. [ ] **Node pins:** `.nvmrc` and `.node-version` at 24.12.4 or later (check `node -v`; the local Node 25.9 is fine for dev, CI uses 24)
4. [ ] **`.editorconfig`:** 2 spaces, LF, final newline; 4 spaces for `*.rs` and `*.sol`
5. [ ] **`turbo.json`** tasks:
   - `build` depends on `^build`; outputs `dist/**`
   - `typecheck`, `test`
   - `dev`: persistent, no cache
   - `//#check` for Biome at the root
   - add `wasm` and `codegen` tasks later, in S06 and S02
6. [ ] **`biome.json`**
   - formatter: 2 spaces, width 100
   - organizeImports groups: node, packages, `@arena/**`, aliases, relative
   - `noRestrictedImports` override for `packages/sim-*/**` and `packages/shared/**` (banned list in PLAN §5)
   - GritQL plugin `tooling/biome/no-nondeterminism.grit`, scoped to `packages/sim-*/src/**`
   - ignore `casino-sdk/`, `references/`, `**/pkg/`, `**/_generated/`
7. [ ] **`packages/tsconfig`:** `base.json`, `vite-react.json`, `node.json`, `sim.json` (lib ES2024 only, `types: []`)
8. [ ] **`packages/shared`:** `src/constants.ts` (`PROTOCOL_VERSION`, `GAME_IDS as const`, limits), `src/ids.ts`, `src/index.ts`; `exports` point to source
9. [ ] **Commit hooks:** `lefthook.yml` (pre-commit runs `biome check --staged --write`; commit-msg runs commitlint) and `commitlint.config.ts` (conventional; scopes are package names)
10. [ ] **CI:** `.github/workflows/ci.yml`
    - pnpm install with the store cached
    - `pnpm check`, `pnpm typecheck`, `pnpm test`
    - Concurrency cancels superseded runs.
11. [ ] **TS7 spike.** Set up throwaway minimal `apps/web` (Vite 8 + React 19) and `apps/server` (tsdown with `dts: false`), then confirm:
    - `vite build`, `tsdown` and `tsc --noEmit` all pass on TS 7
    - Convex is spiked in S02
    - if anything fails, pin TS 6.x in the catalog and record why in ADR-002
12. [ ] **`.env.example`** with every planned variable (see PLAN §3)
13. [ ] ✱ **GitHub:** ask the user for the repo name and visibility (the plan says private), then `gh repo create`, push, invite reviewers later

## Acceptance
- `pnpm install && pnpm check && pnpm typecheck && pnpm test` are green locally and in CI.
- A sim package that imports `three` or calls `Math.random` fails `pnpm check`. Test this with a temporary file, then delete it.

## Exit checklist
ROADMAP · HANDOFF · LOG · commit(s): `chore(repo): …`, `ci: …`
