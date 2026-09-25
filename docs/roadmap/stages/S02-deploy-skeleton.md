# S02: Deploy skeleton (Coolify + Nixpacks server, Vercel web, Convex)

**Goal:** the deployed web connects to the deployed server and to Convex, and auto-deploy works from a push to `main`.

**Read first:** ADR-002, **`docs/research/deep/coolify-nixpacks.md`**, the Coolify skill (`/Users/abu/.claude/skills/coolify`), and `docs/research/deep/tech-stack.md` §1 and §6. Read the Colyseus 0.18 and Convex Auth (anonymous) docs through context7 before writing code.

## Tasks
1. [x] **`apps/server`:**
   - Colyseus 0.18 with `defineServer`, a `hello` room and a `/health` route
   - `src/config/env.ts` (t3-env)
   - `tsdown.config.ts` with `noExternal: [/^@arena\//]` and `dts: false`
   - `start` script runs `node dist/index.js`
   - graceful shutdown on SIGTERM
2. [x] **`apps/server/nixpacks.toml`** as in ADR-002. Test it locally with `nix`/`nixpacks build` if available; otherwise rely on Coolify's build log.
3. [x] ✱ **Coolify:**
   - Ask the user which context and server, and the subdomain (e.g. `play.<domain>`).
   - `coolify context use …`, then `coolify app create github` with `--build-pack nixpacks --base-directory / --ports-exposes 2567 --health-check-enabled --health-check-path /health`.
   - Set the build variables `NIXPACKS_CONFIG_FILE` and `NIXPACKS_NODE_VERSION=24`, runtime env, Auto Deploy, **watch paths** and the stop grace period.
   - Deploy, then check `curl https://play.<domain>/health` and a `wss://` connect.
4. [x] **`convex/`:**
   - `convex.json` (`functions: "src/"`, `codegen.staticApi: true`)
   - Convex Auth with the Anonymous provider
   - `users` table
   - `npx convex dev`, then deploy
   - Export `./api` and `./dataModel`.
5. [x] **`apps/web` minimal:**
   - `index.html` with `<script async src="https://jam.chain.wtf/widget.js"></script>`
   - `public/game.manifest.json` (validated by a test using `validateCasinoGameManifest`)
   - placeholder `og-image.png` at 1200×630
   - the Convex anonymous sign-in on load, plus a Colyseus join to `hello`
6. [x] ✱ **Vercel:**
   - Link the project with the `@arena/web` filter build.
   - SPA rewrite, no frame-blocking headers, Git LFS on.
   - Set `VITE_CONVEX_URL` and `VITE_SERVER_URL`.
7. [x] **Uptime:** add an uptime check on `/health` (Coolify notifications or an external pinger).

## Acceptance
- Deployed web: an anonymous Convex user is created, and the Colyseus room joins over `wss`.
- `curl <web>` contains the widget tag.
- A web-only push does **not** redeploy the server; a push under `apps/server/**` does.

## Exit checklist
ROADMAP · HANDOFF (URLs, Convex deployment name, Coolify app uuid, context) · LOG · commits

## Notes (as built, 2026-09-25)

**Game server on Coolify**
- Context `agari-new`, a tunnel on localhost:8001 to server 84.46.247.92, which the user opens. Server uuid `7otp4kskhbwzkzybsug3uqgx`.
- Project `ruckus` (`01shlznvl6fdjtqh6uxou3my`), app `ruckus-server` (`kkeghmfwz9wl40u2l0n11iow`).
- Nixpacks, base `/`, port 2567, `/health` check, stop grace period 30 s.
- URL: **https://ruckus-play.84.46.247.92.sslip.io** (wss). HTTPS comes from Traefik and Let's Encrypt on sslip.io, the same pattern as the user's `shijima-web`.
- Repo access uses a read-only GitHub deploy key: Coolify private key `ruckus-deploy-key` (`otqghgkqecwo4qpcw7mu8lbs`). There's no GitHub App.
- Env:
  - `NIXPACKS_CONFIG_FILE=apps/server/nixpacks.toml` (build)
  - `NIXPACKS_NODE_VERSION=24` (build). Coolify pre-set it to 22, so it was overridden.
  - `NODE_ENV=production` (runtime only)
- **No push-to-deploy yet.** The Coolify dashboard isn't publicly reachable (only via the tunnel), so GitHub webhooks can't reach it. To deploy, run `coolify deploy uuid kkeghmfwz9wl40u2l0n11iow` from here with the tunnel open. Watch paths only matter once auto-deploy exists. Follow-up: expose the Coolify instance, or use a CI job that SSHes in.
- The Nixpacks image works (health inside and outside the container, WS join, SIGTERM exit 0). It is 2.3 GB because Nixpacks doesn't prune devDependencies; the documented Dockerfile fallback fixes that if it matters.
- Nixpacks' Node provider sets `NODE_ENV=production` at build time, so `nixpacks.toml` installs with `--prod=false`.
- The root `prepare` script skips lefthook when there is no `.git`, as inside the Nixpacks build container.

**Convex** (team `blockchain-oracle`, project `ruckus`)
- dev deployment: `insightful-bass-789`
- prod deployment: `qualified-armadillo-823`
- Both have their own `JWT_PRIVATE_KEY` and `JWKS`, generated locally with jose and never committed.
- `SITE_URL`: dev is `http://127.0.0.1:5173`; prod is `https://ruckus-nine.vercel.app`.
- Generated types (`convex/src/_generated`) are committed, because Vercel builds can't run codegen.

**Web on Vercel** (project `ruckus`, team `blockchain-oracles-projects`)
- Prod alias: **https://ruckus-nine.vercel.app**
- Linked at the repo root with Root Directory `apps/web`, Node 24.x, and `ENABLE_EXPERIMENTAL_COREPACK=1`.
- `apps/web/vercel.json` runs install and build from the root through turbo.
- **`turbo.json` build `env: ["VITE_*"]` is required**, because turbo's strict env mode otherwise drops the VITE vars.
- `.vercelignore` excludes references, casino-sdk and similar.
- **Git integration is connected:** a push to `main` auto-deploys the web app. `ignoreCommand: npx turbo-ignore @arena/web` skips builds that don't touch the web app. `vercel deploy --prod` from the root still works.
- **Vercel blocks deploys from unrecognised commit authors.** The machine default `abu@Abubakrs-MacBook-Pro.local` was blocked, so this repo sets its local git `user.email` to the user's account email.
- Live: the site returns 200, the jam widget tag is in the HTML, and `/game.manifest.json` returns 200.

**Verification**
- Local: `pnpm -F @arena/browser-checks run connectivity` passes.
- **Prod: `WEB_URL=https://ruckus-nine.vercel.app pnpm -F @arena/browser-checks run connectivity` passes.** It gets a Convex prod guest, joins the Coolify server over WSS, and the guest persists across reload.
- Deployed server: `SERVER_URL=wss://ruckus-play.84.46.247.92.sslip.io pnpm -F @arena/browser-checks run check:server` passes.
