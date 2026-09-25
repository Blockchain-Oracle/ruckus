# S02: Deploy skeleton (Coolify + Nixpacks server, Vercel web, Convex)

**Goal:** the deployed web connects to the deployed server and to Convex, and auto-deploy works from a push to `main`.

**Read first:** ADR-002, **`docs/research/deep/coolify-nixpacks.md`**, the Coolify skill (`/Users/abu/.claude/skills/coolify`), and `docs/research/deep/tech-stack.md` §1 and §6. Read the Colyseus 0.18 and Convex Auth (anonymous) docs through context7 before writing code.

## Tasks
1. [ ] **`apps/server`:**
   - Colyseus 0.18 with `defineServer`, a `hello` room and a `/health` route
   - `src/config/env.ts` (t3-env)
   - `tsdown.config.ts` with `noExternal: [/^@arena\//]` and `dts: false`
   - `start` script runs `node dist/index.js`
   - graceful shutdown on SIGTERM
2. [ ] **`apps/server/nixpacks.toml`** as in ADR-002. Test it locally with `nix`/`nixpacks build` if available; otherwise rely on Coolify's build log.
3. [ ] ✱ **Coolify:**
   - Ask the user which context and server, and the subdomain (e.g. `play.<domain>`).
   - `coolify context use …`, then `coolify app create github` with `--build-pack nixpacks --base-directory / --ports-exposes 2567 --health-check-enabled --health-check-path /health`.
   - Set the build variables `NIXPACKS_CONFIG_FILE` and `NIXPACKS_NODE_VERSION=24`, runtime env, Auto Deploy, **watch paths** and the stop grace period.
   - Deploy, then check `curl https://play.<domain>/health` and a `wss://` connect.
4. [ ] **`convex/`:**
   - `convex.json` (`functions: "src/"`, `codegen.staticApi: true`)
   - Convex Auth with the Anonymous provider
   - `users` table
   - `npx convex dev`, then deploy
   - Export `./api` and `./dataModel`.
5. [ ] **`apps/web` minimal:**
   - `index.html` with `<script async src="https://jam.chain.wtf/widget.js"></script>`
   - `public/game.manifest.json` (validated by a test using `validateCasinoGameManifest`)
   - placeholder `og-image.png` at 1200×630
   - the Convex anonymous sign-in on load, plus a Colyseus join to `hello`
6. [ ] ✱ **Vercel:**
   - Link the project with the `@arena/web` filter build.
   - SPA rewrite, no frame-blocking headers, Git LFS on.
   - Set `VITE_CONVEX_URL` and `VITE_SERVER_URL`.
7. [ ] **Uptime:** add an uptime check on `/health` (Coolify notifications or an external pinger).

## Acceptance
- Deployed web: an anonymous Convex user is created, and the Colyseus room joins over `wss`.
- `curl <web>` contains the widget tag.
- A web-only push does **not** redeploy the server; a push under `apps/server/**` does.

## Exit checklist
ROADMAP · HANDOFF (URLs, Convex deployment name, Coolify app uuid, context) · LOG · commits
