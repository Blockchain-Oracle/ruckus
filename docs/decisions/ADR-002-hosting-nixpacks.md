# ADR-002: Hosting: Coolify with Nixpacks for the server, Vercel for the web, Convex for data

- Status: accepted (2026-09-25)
- Context:
  - The owner runs their own Coolify instance and wants Nixpacks with pnpm.
  - The Colyseus server holds long-lived WebSockets.
  - The web app is static.

## Decision
- **`apps/server` (Colyseus 0.18) runs on Coolify with the Nixpacks build pack.**
  - Base Directory is `/`. The root `pnpm-lock.yaml` and the `workspace:*` packages are required, so it is never `/apps/server`.
  - Build variables: `NIXPACKS_CONFIG_FILE=apps/server/nixpacks.toml` and `NIXPACKS_NODE_VERSION=24`.
  - `nixpacks.toml`:
    - `nixPkgs = ["...", "curl"]` (curl is needed for Coolify health checks)
    - install: `pnpm install --frozen-lockfile --filter @arena/server...`
    - build: `pnpm --filter @arena/server... run build` (tsdown bundles `@arena/*` and copies the wasm into `dist/`)
    - start: `node apps/server/dist/index.js`. Use `node` directly, never `pnpm start`, so SIGTERM reaches Colyseus for a graceful drain.
  - The server listens on `0.0.0.0:2567` with its own subdomain, `wss://play.<domain>`. Traefik passes WebSockets through.
  - Health check at `/health` with a start period. Stop grace period 30 s.
  - **Watch Paths** cover only the server's dependency closure:
    - `apps/server/**`
    - `packages/{shared,protocol,netcode,sim-*,casino-math}/**`
    - `crates/**`
    - `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json`
    - `!**/*.md`
  - Auto Deploy runs through the Coolify GitHub App.
  - **Never set `NODE_ENV=production` as a build variable**, because pnpm would then skip the devDependencies the build needs. Secrets are runtime-only.
- **Toolchain pins:**
  - **pnpm 10.x** in `packageManager`, because Nixpacks maps only pnpm 6–10. The local pnpm 11 auto-switches through corepack and manage-package-manager-versions.
  - Node: `engines.node: "24.x"`, plus `.nvmrc` and `.node-version` at ≥24.12.4 (the casino SDK's floor).
- **Committed WASM.** The Rust→WASM output (`packages/sim-chickenz/pkg/`) is committed, because building Rust inside Nixpacks is impractical.
  - CI checks `pkg/SOURCE_HASH`, a hash of the crate sources plus `Cargo.lock`. It doesn't byte-diff the wasm, because wasm-opt output drifts.
- **`apps/web` goes to Vercel.**
  - SPA rewrites and immutable hashed assets.
  - **No `X-Frame-Options` or `frame-ancestors`**, since the jam gallery embeds entries in hover iframes.
  - Git LFS is enabled for binary assets.
- **Convex:** `npx convex deploy`.
- **Coolify context:** chosen by the owner.
  - Contexts found: `agari-new` (default, localhost:8001, the only one responding on 2026-09-25), `agari`, `zkf`, `localhost`, `cloud`.

## Alternatives
- A Dockerfile build pack (node:24-slim, `pnpm deploy --prod`) is documented as the fallback, because Nixpacks is in maintenance mode.
- Railpack is still beta in Coolify.
