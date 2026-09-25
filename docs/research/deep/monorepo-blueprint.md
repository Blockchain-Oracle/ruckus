# Monorepo blueprint and best practices (researched 2026-09-25)

These notes come from the current docs for Turborepo 2.9, Vite 8, TypeScript 7, Biome 2.4/2.5, Colyseus 0.18, Convex, wasm-bindgen, pnpm 11 and t3-env, plus a review of the Chickenz repo. **Project decisions** that override this research: we pin pnpm 10 for Nixpacks, and we commit the wasm `pkg/` (ADR-002).

## Tooling
- **pnpm workspaces + Turborepo 2.9 (not Nx).** Turbo adds caching for the slow tasks: the wasm build and Convex codegen. It needs only a `turbo.json`.
- **Turbo tasks:**

| Task | `dependsOn` | outputs | notes |
|---|---|---|---|
| `wasm` | — | `pkg/**` | inputs: crate `src/**`, `Cargo.*` |
| `codegen` (convex) | — | `src/_generated/**` | |
| `build` | `^build`, `wasm`, `codegen` | `dist/**` | |
| `typecheck` | `^wasm`, `^codegen` | — | |
| `test` | — | — | |
| `dev` | — | — | persistent, no cache |
| `//#check` | — | — | Biome at the root |

## TypeScript
- **TS 7 (native Go compiler, stable 2026-07-08):**
  - Removed: `baseUrl`, `moduleResolution: node10`, `target es5`.
  - `strict` is on by default, and `types` defaults to `[]`.
  - **No programmatic API until 7.1.** That breaks ESLint's type-aware rules, and possibly tsdown's dts output and some Vite plugins. This is why we use Biome, set `dts: false`, and run a spike first. The casino-sdk already uses `typescript@7.0.2`.
- **Shared `@arena/tsconfig`:**
  - `base.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `isolatedModules`, `moduleResolution: bundler`, `module: esnext`, `target: es2024`.
  - Variants: `vite-react.json`, `node.json`, and `sim.json` (lib ES2024 only, `types: []`, so DOM use fails to compile).
- **No project references.** Each package runs `tsc --noEmit`, cached by turbo.
- **Internal packages ship their source ("Just-in-Time"):**
  - `exports: { ".": "./src/index.ts", "./constants": "./src/constants.ts" }`.
  - Vite, tsx, tsdown and Convex's esbuild all compile them.
  - `paths` can't be used inside these packages. Use subpath imports (`"imports": { "#*": "./src/*" }`) instead.
- **Aliases:**

| Where | Alias | How it resolves |
|---|---|---|
| Across packages | `@arena/*` | workspace links + `exports` |
| `apps/web` | `@/*` | `compilerOptions.paths`, read natively by Vite 8's `resolve.tsconfigPaths: true` (no plugin) |
| Server | `#app/*` | subpath imports |
| `convex/` | relative imports only | — |

- **Server runtime:**
  - Dev: `tsx watch`.
  - Prod: bundle with **tsdown**, `noExternal: [/^@arena\//]`.
  - **Don't rely on Node's type stripping in prod.** Node refuses to strip types under `node_modules`, so it fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
  - `erasableSyntaxOnly` means no enums and no decorators. Use `as const` and the Colyseus `schema()` builder.

## Lint and format: one Biome 2.x config at the root
- **Import sorting:** `assist.actions.source.organizeImports` with groups: `:NODE:`, then `:PACKAGE:` except `@arena/**`, then `@arena/**`, then `:ALIAS:`, then `:PATH:`.
- **Sim purity:** an `overrides` entry for `packages/sim-*/**` and `packages/shared/**` sets `style/noRestrictedImports`, banning: three, `three/*`, `@react-three/*`, react, zustand, motion, `node:*`, `@arena/audio`, `@arena/fx`.
- **GritQL plugin** `tooling/biome/no-nondeterminism.grit`, scoped with `includes: ["packages/sim-*/src/**"]`. It bans `Math.random()`, `Date.now()`, `new Date()`, `performance.now()`, `setTimeout` / `setInterval` and `crypto.getRandomValues`.
- **Game modules stay separate:** inside `apps/web/src/games/**`, ban importing `@/games/*`. Games use relative imports and never import each other.
- **Caveat:** a Biome upgrade or config change invalidates the whole turbo cache.

## Constants and environment
- **Sim tuning:** `packages/sim-<game>/src/constants.ts`.
  - Put units in the names: `GRAVITY_PX_PER_TICK2`, `RESPAWN_TICKS`, `TICK_RATE_HZ`.
  - Derive dependent values: `TICK_DT_MS = 1000 / TICK_RATE_HZ`.
  - Tables are written `as const satisfies Record<WeaponId, WeaponStats>`.
  - Prefer integers or fixed-point wherever JS and Rust must agree.
- **Visual tuning:** `apps/web/src/games/<game>/config.ts`. It never feeds the sim.
- **Cross-cutting constants:** `packages/shared/src/constants.ts` (`PROTOCOL_VERSION`, game ids, room names, limits).
- **Env validation:** `@t3-oss/env-core` + zod 4 with `emptyStringAsUndefined`.
  - Web: `clientPrefix "VITE_"`, `runtimeEnv: import.meta.env`.
  - Server: `process.env`.
  - Convex: `npx convex env set`, validated at the top of each module.
- **Feature flags:** `packages/shared/src/flags.ts` holds typed defaults, which env can override.

## `apps/web` structure
- Dependency direction (bulletproof-react): `shared → features/games → app`. Games never import each other.
- `games/registry.ts` holds eager metadata plus a lazy `load: () => import("./<game>")`. Each game becomes its own chunk. Vite 8 deprecates `manualChunks`; use Rolldown's `codeSplitting` groups (three/R3F in a vendor group).
- **Inside a game module:**
  - `scene/`: R3F components. `useFrame` reads the store with `getState()`.
  - `hud/`: the DOM overlay, rendered outside `<Canvas>`.
  - `store.ts`: a zustand store factory, one per match, reset on unmount.
  - `hooks/`, `net/`, `config.ts`, `assets/`.

## Colyseus 0.18
- **Layout:**
  - `src/app.config.ts`: `defineServer({ rooms: { x: defineRoom(XRoom) }, routes })`.
  - `src/index.ts`: calls listen.
  - `src/rooms/<game>/`: one folder per game room.
- **Schemas and messages** live in `@arena/protocol`, written with `schema({...}, "Name")` / `t.*` (no decorators), with a subpath per game. The client only needs `import type`.
- **Optional full-stack typing:** `new Client<typeof server>(url)` from `@colyseus/sdk`.
- **Built in:** prediction, rollback and lag compensation, plus the `@colyseus/react` hooks `usePredict` and `useReconciler`.

## Convex
- A top-level `convex/` workspace package, `@arena/convex`.
- `convex.json`: `{ "functions": "src/", "codegen": { "staticApi": true, "staticDataModel": true } }`.
- Exports: `./api` → `./src/_generated/api.js`, `./dataModel` → `./src/_generated/dataModel.d.ts`. This follows the official turbo template.
- Clients: the web uses `ConvexReactClient`. The server uses `ConvexHttpClient`, calling HTTP actions or internal mutations with a shared secret.
- The default Convex runtime isn't Node, so `@arena/shared` must stay free of `node:` imports.

## Rust → WASM
- wasm-pack now lives under the `wasm-bindgen` org (v0.14+). The rustwasm org was archived in July 2025.
- **Use one `--target web` build for both environments:**
  - Browser: `import url from "../pkg/x_bg.wasm?url"; await init({ module_or_path: url })`.
  - Node: `initSync({ module: readFileSync(new URL("../pkg/x_bg.wasm", import.meta.url)) })`.
- Use a root `Cargo.toml` workspace.
- Pin versions in `rust-toolchain.toml`.

## Git
- **Commits:** Conventional Commits with the package as the scope, enforced by commitlint + lefthook. Pre-commit runs `biome check --staged --write`.
- **Pins:** `.nvmrc`, an exact `packageManager` plus `devEngines.packageManager`, and catalogs in `pnpm-workspace.yaml`.
- **Editorconfig:** 2 spaces and LF; 4 spaces for `*.rs` and `*.sol`.

## Chickenz: keep and fix
- **Keep:**
  - The sim package exports its TS source.
  - The pure PRNG with explicit state (`prngNext(state) → [value, next]`).
  - Sim constants separate from visual constants.
  - `noUncheckedIndexedAccess`.
  - One `--target web` wasm build used on both sides.
  - Vite `envDir` pointing at the root, with the commit hash injected through `define`.
  - CI with concurrency cancel and cargo cache.
- **Fix:**
  - Cross-app imports of `protocol.ts`. Move it into `@arena/protocol`.
  - Deep relative imports of the wasm `pkg/`. Make it its own package.
  - `enum` usage.
  - `Record<number, …>` types. Use `satisfies` instead.
  - Hard-coded lint globs.
  - Vite building into the server's `public/`.
  - Mixing Bun and Node.
  - CI repeating the same setup steps.
