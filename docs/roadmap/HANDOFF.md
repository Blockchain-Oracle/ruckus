# HANDOFF (updated 2026-09-25 by session 3)

**Stage:** S09 Chickenz feel is active. S10a is **done**: the Back a Bird simulator e2e passes, 6× class included. The play-first rule still holds (user, 2026-09-25): every game must be playable vs bots, with friends and as a watcher, at full reference fidelity, before its wager.

**Last completed (session 3):**
- Chickenz settings (`games/chickenz/prefs.ts`, `hud/ChickenzSettings.tsx`):
  - Key rebinding: 5 actions × 2 slots, capture phase, mouse buttons, duplicates cleared, Reset.
  - A Dynamic Camera toggle and a "Your bird" choice.
  - Replay tutorial.
  - A fullscreen button.
  - The game module has a `Settings` slot in the hub sheet.
- World-space nameplates: slot-coloured names and Chickenz HP bars. The stomp "SHAKE HIM OFF!" prompt and bar now sit under the stomped bird.
- Quick-chat emotes:
  - Keys 1–6 or the chat button; they draw as pixel speech bubbles.
  - The server validates them and rate-limits at 900 ms.
  - Labelled practice bots react.
- **Server fix:** `onAuth` rejected mid-match joins, so invite links failed during a match. Deployed and verified on production.
- `pnpm -F @arena/browser-checks back-bird` is the S10a e2e.
- Judge pass:
  - The hub opens on Chickenz's live attract (ADR-007).
  - Portrait hub layout.
  - A rotate hint for upright phones.
  - Firefox is OK.
- `docs/CREDITS.md` now lists every ElevenLabs asset. The parity ledger was audited: 110 have, 20 partial, 14 missing (non-blocked).

**NEXT ACTION:**
1. **✱E is deferred by the user:** no submission until all four games are playable and the hub presents all of them. Keep the repo private and invite reviewers at submission. See ADR-007's follow-up.
2. **Pool (S12–S16), play-first:**
   1. Write the reference parity ledger (`docs/assets/pool-parity.md`).
   2. Build the sim and a playable game vs bots.
   3. Then rooms, then the wager.
   Then Soccer (S17–S21) and Runner (S22–S26) the same way.
3. **Then rebuild the hub landing** as a four-game arena, with each cabinet showing its game's live attract.
4. **Chickenz S09 feel gaps**, interleaved as polish. From the ledger audit:
   1. The weapon/ammo HUD.
   2. Muzzle flash, shake and hit-stop.
   3. Stomp layering.
   4. The projectile muzzle origin.
   5. SFX for silent events.
   6. `SUDDEN DEATH IN n`.
   7. A lose sting.
   8. "DRAW!" in the round banner.
   9. Online correction smoothing.
   10. The shoot-button position and the 16 px gutter.
   11. Music focus fade.
   12. The round-start camera snap.
   13. A kill feed.
   14. A music toggle.
   15. Suppress the canvas context menu.

**Uncommitted work:** none.

**Blocked on the user:** nothing.

**Environment state:**
- The simulator runs from `casino-sdk` with `npm start` (:3300, chain :8545). Log: `/tmp/ruckus-sim.log`. The local RuckusGame is at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` (changes on restart; re-run `pnpm -F @arena/contracts sync`).
- Web dev server: :5173 (`pnpm -F @arena/web exec vite --port 5173 --host 127.0.0.1`). `apps/web/.env.local` points at Convex dev and `ws://127.0.0.1:2567`.
- Local game server: `node apps/server/dist/index.js` on :2567.
- Debug panels: `?debug=casino` and `?debug=connectivity`. `?preview` shows hidden (unshipped) games in the hub.
- Branch `main` tracks origin. CI is green. This repo's git author email is `abubakrjimoh16488@gmail.com`, which Vercel needs.
- Toolchain: node 25.9 (the repo pins 24.21.0), pnpm 10.34.5, forge 1.7.1, rustc 1.98.1 with the wasm32 target, nixpacks 1.41, docker (OrbStack), and the elevenlabs, 21st, vercel, coolify and convex CLIs. **wasm-pack is not installed** (S06 needs it).

**Last green verification (session 3):**
- `pnpm verify` passes. `back-bird` e2e PASS (10 VRF rounds, all 4 classes, flawless 6× on round 7). `firefox` probe OK. Production late-join is verified with a two-client script against wss://ruckus-play.84.46.247.92.sslip.io.

**Older verification:**
- `pnpm verify` passes, and `pnpm -F @arena/web build && pnpm -F @arena/web budgets` passes (shell 143.7 KB gz).
- `forge test` passes.
- `prod-frame` also boots the real hub framed. Browser checks pass: `casino` (simulator), `prod-frame`, and `connectivity` against both local and **production**.

**Gotchas learned (the rest are in the stage notes):**
- The ChickenzDriver keeps stepping after `match_over` (the taunt window). Compare fights with `driver.overHash`, which is taken on the exact end tick, never `sim.hash()` later.
- Plates and bubbles over birds render with `depthTest: false` plus `renderOrder`. Thin layers 0.001 apart z-fight at play-camera distance, which made the HP bars black.
- Playwright's Chromium can vanish from the cache. Fix it with `pnpm exec playwright-core install chromium` in tooling/browser-checks.
- ElevenLabs can still return near-silent takes: check `volumedetect` before using one.
- **Colyseus "seat reservation expired" (4002) on every join** means two peer variants of `@colyseus/core` are installed. The matchmaker and the WS transport then keep separate room registries. apps/server pins `@colyseus/core`, `ws-transport` and `auth` directly to keep them unified. Check `ls node_modules/.pnpm | grep @colyseus+core`.
- A local "couldn't reach the game server" is usually the local `node apps/server/dist/index.js` being down or stale. Rebuild it and restart it.
- Firefox and Zen render through WebGL2 (`engine/renderer.ts`). `pnpm -F @arena/browser-checks firefox` probes them (the Playwright Firefox build must match playwright-core).
- Rooms never lock mid-match. Late joiners are `waiting` seats that spectate, then play the next match.
- React StrictMode double-mounts effects, so free wasm objects in cleanup and recreate them (`driver.start`/`stop`).
- HMR resets zustand stores mid-game, so reload the page before judging state bugs.
- Dev QA handles are `window.__ruckusMachine`, `__ruckusWager`, `__ruckusMatch` and `__ruckusTutorial` (DEV builds only).
- Don't use `alphaTest` 0.5 on sprites that fade: it discards at half opacity. Use 0.1.
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
