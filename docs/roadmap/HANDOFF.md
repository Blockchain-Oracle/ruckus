# HANDOFF (updated 2026-09-25 by session 2)

**Stage:** S03 is done. Now on **S06 Chickenz sim**, step 1 (expand the stub into tasks). [stages/S06-chickenz-sim.md](stages/S06-chickenz-sim.md)

**About ✱E:** the early submission waits until a *finished* slice exists: the hub, Chickenz, and the Back Your Chicken wager. A site of debug panels would be rejected as half-finished. After S03, S06 and S10a, check whether a finished slice exists, and submit it if it does.

**Last completed:** S03, the engine shell: a persistent WebGPU canvas with attract orbit, play dolly and scrim; the hub overlay and brand UI kit; `@arena/audio`, `@arena/fx`, the audio-sprite pipeline with ElevenLabs UI sounds; CI size budgets. Details are in the S03 notes. S02 infrastructure is unchanged (web https://ruckus-nine.vercel.app, server wss://ruckus-play.84.46.247.92.sslip.io, Convex prod `qualified-armadillo-823`).

**NEXT ACTION:** S06. Read ADR-005, `docs/research/deep/chickenz.md` §1, §2, §5 and §6, and `references/chickenz/services/prover/core/src/fp.rs`. Expand the S06 stub into tasks, then create `crates/chickenz-sim` (N≤4 FFA) and install wasm-pack.

**Uncommitted work:** none.

**Blocked on the user:** nothing. Server deploys need the user's Coolify tunnel open on localhost:8001.

**Environment state:**
- The simulator runs from `casino-sdk` with `npm start` (:3300, chain :8545). Log: `/tmp/ruckus-sim.log`. The local RuckusGame is at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` (changes on restart; re-run `pnpm -F @arena/contracts sync`).
- Web dev server: :5173 (`pnpm -F @arena/web exec vite --port 5173 --host 127.0.0.1`). `apps/web/.env.local` points at Convex dev and `ws://127.0.0.1:2567`.
- Local game server: `node apps/server/dist/index.js` on :2567.
- Debug panels: `?debug=casino` and `?debug=connectivity`. `?preview` shows hidden (unshipped) games in the hub.
- Branch `main` tracks origin. CI is green. This repo's git author email is `abubakrjimoh16488@gmail.com`, which Vercel needs.
- Toolchain: node 25.9 (the repo pins 24.21.0), pnpm 10.34.5, forge 1.7.1, rustc 1.98.1 with the wasm32 target, nixpacks 1.41, docker (OrbStack), and the elevenlabs, 21st, vercel, coolify and convex CLIs. **wasm-pack is not installed** (S06 needs it).

**Last green verification:**
- `pnpm verify` passes, and `pnpm -F @arena/web build && pnpm -F @arena/web budgets` passes (shell 143.7 KB gz).
- `forge test` passes.
- `prod-frame` also boots the real hub framed. Browser checks pass: `casino` (simulator), `prod-frame`, and `connectivity` against both local and **production**.

**Gotchas learned (the rest are in the stage notes):**
- The shadcn CLI adds `cn`, lucide and next-themes and imports `cn` from the wrong place. Fix its imports to `@/lib/utils.ts` and use Phosphor.
- ElevenLabs sometimes returns a near-silent take. The audio-sprite builder fails on it, so regenerate that take.
- Pin pnpm 10.x, and Node 24.21.0 (24.12.4 doesn't exist).
- Biome plugin globs need a `**/` prefix. Purity lint rules cover only `src/`. The vendored SDK is excluded from Biome.
- **Coolify:**
  - It pre-sets `NIXPACKS_NODE_VERSION=22`, which we overrode to 24.
  - Nixpacks sets `NODE_ENV=production` at build time, so install uses `--prod=false`.
  - `prepare` skips lefthook when there's no `.git`.
  - There's no push-to-deploy, because the dashboard is tunnel-only. Deploy with `coolify deploy uuid kkeghmfwz9wl40u2l0n11iow`.
- **Vercel:**
  - `turbo.json` build needs `env: ["VITE_*"]`.
  - It blocks commits from unrecognised authors.
  - Run the CLI from the repo root.
- The host binds per iframe element, so the game must never reload itself.
- Foundry treats `table*` functions as table tests. NatSpec comments can't contain `@scope`.
- The Hardhat node rejects `cast send`, so use viem.
- `pnpm server` is a pnpm builtin, so use `run check:server`.
- tsx injects `__name` into functions passed to `page.evaluate`, so pass source strings.
- Chrome blocks public origins from framing 127.0.0.1.
- commitlint rejects sentence-case subjects.
- The user doesn't want the ElevenLabs policy raised again. Use ElevenLabs freely.

**Research to read before resuming:** S03's "Read first" list.

**Deadline status:** submissions close Sun Sep 27 at 23:59 UTC. The user prefers quality. ✱E happens once a finished slice exists. **Submitted build:** none.
