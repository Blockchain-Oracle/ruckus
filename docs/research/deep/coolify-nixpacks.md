# Coolify + Nixpacks deployment of a pnpm monorepo (researched 2026-09-25)

Sources:
- Coolify build packs overview: https://coolify.io/docs/applications/build-packs/overview
- Coolify Nixpacks: https://coolify.io/docs/applications/build-packs/nixpacks
- Coolify Node versioning: https://coolify.io/docs/applications/build-packs/nixpacks/node-versioning
- Nixpacks configuration file: https://nixpacks.com/docs/configuration/file
- Nixpacks environment: https://nixpacks.com/docs/configuration/environment
- Nixpacks Node provider: https://nixpacks.com/docs/providers/node
- Coolify health checks: https://coolify.io/docs/knowledge-base/health-checks
- Coolify domains: https://coolify.io/docs/knowledge-base/domains
- Coolify environment variables: https://coolify.io/docs/knowledge-base/environment-variables
- Coolify automatic deployments: https://coolify.io/docs/applications/deployments/automatic-deployments
- Colyseus deployment: https://docs.colyseus.io/deployment

## Status of the build packs
- Coolify v4.1–4.2 (2026) supports these build packs: Dockerfile, Nixpacks, **Railpack (beta)**, Static, Docker Compose and Docker Image.
- **Nixpacks is still Coolify's default.** It switched to Railpack and was reverted: PR #9117, issue #7983.
- **Nixpacks is in maintenance mode.** Its README says it is not under active development and recommends Railpack.
- The local `coolify` CLI v1.8.0 accepts `--build-pack nixpacks|static|dockerfile|dockercompose`. It has no railpack option.

## Rules for a pnpm workspace
- **Base Directory must be `/`.** The build needs the root `pnpm-lock.yaml` and the `workspace:*` packages, so never set it to `/apps/server`. Pick the app with `pnpm --filter`.
- **Pin pnpm with `packageManager`.** Nixpacks reads it first and maps **pnpm 6–10** to Nix packages. Without it, Nixpacks guesses from `lockfileVersion` (9.0 → pnpm 9). **pnpm 11 is not mapped, so pin 10.x.**
- **Pin Node three ways:** `engines.node: "24.x"` (not `>=24`, since Nixpacks takes the major only), `.node-version`, and the Coolify build variable `NIXPACKS_NODE_VERSION=24`. Without these, Nixpacks falls back to Node 18. Coolify also has bug #8698 about Node 24 not being picked up.
- **Watch the workspace file.** An empty `pnpm-workspace.yaml` makes pnpm 9+ refuse to run. pnpm 10 blocks dependency install scripts unless they are listed in `onlyBuiltDependencies`.

## `apps/server/nixpacks.toml`
Coolify build variable: `NIXPACKS_CONFIG_FILE=apps/server/nixpacks.toml`.

```toml
[variables]
NIXPACKS_NODE_VERSION = "24"   # also set it as a Coolify build variable; Coolify's value overrides this file

[phases.setup]
nixPkgs = ["...", "curl"]      # "..." keeps the provider's node and pnpm; curl is needed for the health check

[phases.install]
cmds = ["pnpm install --frozen-lockfile --filter @arena/server..."]

[phases.build]
cmds = ["pnpm --filter @arena/server... run build"]

[start]
cmd = "node apps/server/dist/index.js"   # run node directly (not pnpm start) so SIGTERM reaches Colyseus
```
- Precedence: provider < config file < environment < CLI.
- Nixpacks never prunes devDependencies (`NPM_CONFIG_PRODUCTION=false`), so expect a large image.
- **Don't set `NODE_ENV=production` as a build variable.** pnpm would skip the devDependencies (TypeScript, turbo) and the build breaks. Make it runtime-only.
- If `NIXPACKS_TURBO_APP_NAME` is set, Nixpacks runs turbo itself. The explicit commands above avoid that.
- Patch versions can drift between builds unless `nixpkgsArchive` is pinned.

## Coolify app settings
- **Ports and domain:** Ports Exposes `2567`. Domain `https://play.<domain>:2567`. The `:2567` only picks the port inside the container; clients still connect with `wss://play.<domain>` on 443. The app must listen on `0.0.0.0`.
- **WebSockets:** both Traefik (the default) and Caddy pass the Upgrade through. **Use a dedicated subdomain**, because routing WebSockets by path under a shared domain has known Traefik issues. A single-process Colyseus server needs no sticky sessions.
- **Health check:** runs inside the container with curl or wget. Use path `/health` on port 2567 with a start period. If every container is unhealthy, Traefik returns 404 or "No available server". Health checks also give zero-downtime rolling updates. Don't put a `HEALTHCHECK` in a Dockerfile, because it overrides the UI settings.
- **Environment variables:**
  - Each variable has a Build Variable toggle and a Runtime Variable toggle. Secrets should be runtime-only.
  - Coolify injects `PORT`, `HOST=0.0.0.0`, `COOLIFY_FQDN`, `COOLIFY_URL` and `SOURCE_COMMIT`.
- **Auto-deploy:**
  1. Connect the Coolify GitHub App under Sources.
  2. Create the app from the private repo using the GitHub App.
  3. Turn on Configuration → Advanced → Auto Deploy.
  4. Set **Watch Paths** (General → Build) so a web-only push doesn't restart the server and kill live matches.
- **Stop grace period:** about 30 s. Every deploy replaces the container, which kills live rooms.

```
coolify app create github --github-app-uuid … --git-repository owner/repo --git-branch main \
  --build-pack nixpacks --base-directory / --ports-exposes 2567 \
  --health-check-enabled --health-check-path /health --stop-grace-period 30
```

## WASM
Commit the wasm-pack `pkg/` output, or build it in GitHub Actions. Building Rust with the wasm32 target inside Nixpacks is painful. Load it at runtime with `fs.readFileSync(new URL('./x.wasm', import.meta.url))`. `tsc` doesn't copy `.wasm` files, so copy them into `dist` in the tsdown config.

## Fallback: Dockerfile build pack
Use Base Directory `/` and Dockerfile Location `/apps/server/Dockerfile`:

```dockerfile
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @arena/server...
RUN pnpm --filter @arena/server... run build
RUN pnpm --filter @arena/server deploy --prod /out   # pnpm 10: needs inject-workspace-packages=true

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=2567 HOST=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /out .
USER node
EXPOSE 2567
CMD ["node", "dist/index.js"]
```

## Local Coolify contexts (probed read-only on 2026-09-25)
- `agari-new` (default, localhost:8001, probably an SSH tunnel) was the only context that responded.
- `zkf` (86.48.5.116:8000) and `agari` (84.46.247.92:8000) timed out.
- `cloud` (app.coolify.io) and `localhost:8000` were not probed.
