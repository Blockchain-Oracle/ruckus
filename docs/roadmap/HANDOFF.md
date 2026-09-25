# HANDOFF (updated 2026-09-25 by session 1)

**Stage:** S01 is done. Now on **S02 Deploy skeleton**, step 1. [stages/S02-deploy-skeleton.md](stages/S02-deploy-skeleton.md)

**Last completed:**
- S01 casino core: RuckusGame contract, casino-math, vendored SDK, casino-bridge and DemoHost, the debug panel, and the browser e2e plus prod-sandbox probe.
- See `docs/roadmap/stages/S01-casino-core.md` for the notes.

**NEXT ACTION:** S02 task 1. Read the Colyseus 0.18 docs through context7, then turn `apps/server` into a Colyseus server with a `hello` room and `/health`.

**Uncommitted work:** none.

**Blocked on the user (✱, will be needed in S02):**
- Which Coolify context and server to use, and the subdomain for the game server (e.g. `play.<domain>`). Is there a domain?
- Vercel team/account for the web app.
- A Convex account and login (`npx convex dev` needs an interactive login).

**Environment state:**
- The simulator runs in the background from `casino-sdk` with `npm start`: harness :3300, chain :8545, coinflip :3100. Log: `/tmp/ruckus-sim.log`.
- RuckusGame is deployed locally at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853`. The address changes on every simulator restart; re-run `pnpm -F @arena/contracts sync`.
- The web dev server runs on :5173 (`pnpm -F @arena/web exec vite --port 5173 --host 127.0.0.1`). Log: `/tmp/ruckus-web.log`.
- Debug page: http://127.0.0.1:5173/?debug=casino. Inside the simulator: `http://localhost:3300/?game=<encoded web url>&gameAddress=<addr>`.
- Branch `main` tracks `origin` (github.com/Blockchain-Oracle/ruckus). CI is green.
- Local toolchain:
  - node 25.9 (the repo pins 24.21.0), pnpm 10.34.5 through corepack
  - forge 1.7.1, rustc 1.98.1 with the wasm32 target
  - the elevenlabs CLI 1.4.0, the 21st CLI, and Playwright (cached headless shell)
  - **wasm-pack is not installed** (needed in S06)

**Last green verification:**
- `pnpm verify` passes: biome, typecheck and tests.
- `forge test`: 11 passing.
- `pnpm -F @arena/browser-checks casino`: PASS.
- `pnpm -F @arena/browser-checks prod-frame`: done.

**Gotchas learned:**
- Pin pnpm 10.x for Nixpacks. Node is 24.21.0, because 24.12.4 doesn't exist.
- Biome plugin globs need a `**/` prefix. Purity overrides apply only to `src/`. The vendored SDK is excluded from Biome, so its bytes stay identical.
- tsdown needs `fixedExtension: false` to emit `dist/index.js`.
- The vendored `@chain/casino-sdk` builds to `dist/`. Run `pnpm -F @chain/casino-sdk build` after a sync.
- Foundry treats `table*` functions as table tests. NatSpec (`///`) comments can't contain `@scope/pkg` text.
- The Hardhat node rejects `cast send` (duplicate `data`/`input` fields), so use viem scripts.
- The host binds per iframe element, so the game must never reload itself.
- Chrome blocks public origins from framing `127.0.0.1`, and https parents block http frames as mixed content. The prod-frame probe serves a real `localhost:9999` page.
- tsx injects `__name` into functions passed to `page.evaluate`, so pass source strings instead.
- commitlint rejects sentence-case subjects.
- The user doesn't want the ElevenLabs policy raised again.

**New ADRs:** none this stage.

**Research to read before resuming:** the "Read first" list in S02, especially `docs/research/deep/coolify-nixpacks.md`.

**Deadline status:** submissions close Sun Sep 27 at 23:59 UTC. The user doesn't want quality cut. An early eligible slice is planned at ✱E, after S02. **Submitted build:** none.
