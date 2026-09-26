# HANDOFF (updated 2026-09-26 by session 5)

**Stage:** All four games are complete and live, and the hub opens on the **arena landing**.
- Chickenz, 8-Ball, Egg Soccer and Neon Dash are each playable vs bots, online with friends and watchers, and with lessons, and each has its VRF wager.
- **Runner S22–S26 done this session.**
- The user's precondition for submission (all 4 games + a multi-game hub) is now met, so **✱E submission is next and needs the user.**
- S09 Chickenz feel gaps are still open.

**Last completed (session 5): Neon Dash, the runner (after KaspaKinesis/DAG Dasher):**
- **S22 sim** (`packages/sim-runner`):
  - a same-seed ghost race: the course is `f(seed)`, coins and orbs are taken per runner
  - KK numbers and barrier grammar
  - coins are life (two free hits), coin momentum (+1% per coin, max 10), air slam, photo finishes
  - skill bots with misses; Float64 snapshots
- **S23 render:**
  - neon road/city (procedural, floating origin)
  - verb-silhouette barriers
  - Quaternius CC0 mannequin with 14 clips (`packages/assets-pipeline/src/runner-character.ts`; `assets-src/runner/fetch-packs.sh` pulls the packs from itch)
  - hologram ghosts that fade near you
  - sparks, shake, speed lines
  - HUD: rail, coins, km/h, standings, results
  - keys and mid-gesture swipes
  - ElevenLabs SFX + synthwave chase theme
- **S24 online:**
  - RunnerRoom plus lobby, watchers and walkout → bot
  - **"beat my run" links**: seed + RLE inputs in the URL, the time recomputed by replay; the hub shows "Beat NAME · m:ss.cc"
  - dead heats fall to a seeded draw, not slot 0
- **S25 wager "Call the Wipeout":**
  - bet types **18–23**: any wipeout 1.2×, jump 3.84×, duck 3.2×, clean 4.8×, dodge 6.4×, strict 9.6×; all 96%
  - gauntlet + `runner-wipeout.v1` bank
  - simulator e2e PASS (18 rounds, 9.6× paid exactly)
- **S26:** six hands-on lessons.
- **Arena landing** (ADR-007 resolved): no deep link → "Four games. One arena.", cabinet cards with **real recorded attract loops**.
  - `pnpm -F @arena/browser-checks capture-previews` then `pnpm -F @arena/assets-pipeline previews`
  - A deep link never flashes the landing.
- **Cross-cutting fixes:**
  - `bankHash` is canonical, and the bank tests pin their hashes. The Soccer doc hash is updated.
  - Protocol **2**: the runner snapshot gained `finishM`.
  - Budgets no longer count shell assets into game chunks; the shell budget is now 160 KB (157.0 used).
  - The casino-bridge test used a now-real bet type as "unknown".
  - A StrictMode remount stopped the runner's animations (T-pose).

**NEXT ACTION:**
1. **✱E submission. This needs the user**; ask, don't do.
   - The form wants the Discord, X and Telegram handles, source access (repo reviewers invited) and the go-ahead.
   - Prepared: title RUCKUS, URL https://playruckus.xyz (custom domain, Namecheap → Vercel; ruckus-nine.vercel.app still works), declared RTP 96%, pitch in the session 5 summary.
   - Production is checked: widget tag, og:image 1200×630, manifest, no frame-blocking headers.
   - The contract now has bet types 0–23. They are final unless a new wager is added (the one-contract rule).
2. S27 tournaments / daily seeded cups (a fixed daily seed per game; runner PB ghosts per daily course).
3. S28 mobile/a11y/perf re-audit. The shell is 157 KB gz, so auditing the growth from 143.7 KB is still open.
4. Chickenz feel gaps (ledger audit list).

**Uncommitted work:** none.

**Blocked on the user:** ✱E submission (handles, reviewers, go-ahead).

**Environment state:**
- Simulator: `cd casino-sdk && npm start` (:3300, chain :8545). RuckusGame is at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` with bet types 0–23 (re-sync with `pnpm -F @arena/contracts sync`, then restart).
- Web dev server: :5173. Local game server: `node apps/server/dist/index.js` on :2567 (rebuild after protocol changes: it runs protocol 2).
- **Coolify deploys:** open the tunnel yourself with `ssh -N -L 8001:127.0.0.1:8000 agari-box` (the key is in ~/.ssh/config), then `coolify deploy uuid kkeghmfwz9wl40u2l0n11iow`. Production server: protocol 2, commit 424f9c0+.
- Vercel production: https://playruckus.xyz (alias https://ruckus-nine.vercel.app), which deploys on push to main.
- Dev handles (DEV builds only): `__ruckusRunner`, `__ruckusRunnerTutorial`, `__ruckusWipeout`.
- `?capture` (DEV) centres attract framing for recording previews.

**Last green verification (session 5):**
- `pnpm verify`, Foundry (25 tests), web build + budgets.
- Browser checks (web dev server; Runner scripts):
  - `runner-room` PASS: 238/238 samples, worst 0.7 m
  - `runner-challenge` PASS: the ghost finished on the exact recorded tick
  - `runner-tutorial` PASS
  - `runner-wipeout` PASS: simulator, 18 rounds
- Production SDK probe: a runner room race gave 100 snapshots at 20.6 Hz, all unpacked by the current client.
- Screens at 1280×720, 1440×900, 844×390 and 390×844 (landing, race, results, call sheet, lessons).

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

**Pool is live in the hub** (the server with PoolRoom is deployed and verified on production):
- **S12, the engine:** exact arithmetic, rules, and a searching bot.
- **S13, the table:** a cinematic table; controls for keys, touch, spin and calling the 8; audio and music; a phone layout.
- **S14, rooms:** `PoolRoom` is server-authoritative lockstep.
  - Raw Float64 tables; aim relay; labelled bots; watchers; a 20 s reconnect.
  - The generic `features/rooms` kit and lobby sheet.
  - `pool-room` check: two browsers stay bit-identical.
- **S15, the wager "Call Your Shot":** four contract tiers at 96%; the realise-your-stroke search; the `pool-wager` simulator e2e passes up to 9.6×.
- **S16, the tutorial:** five hands-on lessons.
- The `select()` double-select fix (it remounted scenes and dropped online tables).

**Soccer (session 4):** S17 sim done; **S18 done — Egg Soccer is live in the hub** (`apps/web/src/games/soccer`).
- Toon egg players (lathe egg, 3-band toon, ink hull outline, ball-tracking eyes + blink, boots, kit band, 2v2 partner headband, squash/stretch spring, freeze/speed/grow looks).
- Procedural football; night stadium (mowed pitch, scrolling LED boards, instanced reactive crowd, floodlight towers, glass end walls); goals with billowing nets.
- HUD: score bug + clock, power-up chips, 3-2-1-GO / GOAL! / FULL TIME call-outs (motion), results + rematch, How to play (blocks the first kickoff, then a ? button), key hint, touch ◀ ▶ + JUMP.
- ElevenLabs SFX sprite (19 sounds, crowd bed loop) + stadium anthem; Settings: 1v1/2v2 and Rookie/Pro/Legend.
- Camera uses rig `pose` (tilted down, width-fit, lifts for high balls). Screenshot helper: `tooling/browser-checks/src/soccer-shots.ts`.

**NEXT ACTION:**
1. **Runner S22–S26** (play-first: sim → render → room → wager → tutorial), after KaspaKinesis. Reuse Soccer's patterns: bit-exact snapshots, whole-world prediction, lessons judged by the live sim, and a finish-style bank-presented wager. Every overlay must fit phone sizes (memory: overlays-fit-screen).
   - Soccer is done:
     - S20 **Call the Finish**: 13 calls on how a 20 s 2v2 golden goal ends, bet types 5–17 at 96%, the `soccer-finish.v1` bank. Check with `pnpm -F @arena/browser-checks soccer-finish` (needs the simulator on :3300).
     - S21 lessons: `soccer-tutorial`. S19 rooms: `soccer-room`.
2. Keep the controls rule for every game: controls never fight the pointer; every control written on screen.
3. Four-game hub landing (ADR-007 follow-up).
4. Chickenz feel gaps (ledger audit list).
5. Audit shell bundle growth (143.7 → 150.2 KB gz during Pool/Soccer; budget raised to 155 KB).
6. ✱E deferred until all four games are done.

**Uncommitted work:** none.

**Blocked on the user:** nothing.

**Environment state:**
- The simulator runs from `casino-sdk` with `npm start` (:3300, chain :8545). Log: `/tmp/ruckus-sim.log`. The local RuckusGame is at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` (changes on restart; re-run `pnpm -F @arena/contracts sync`).
- Web dev server: :5173 (`pnpm -F @arena/web exec vite --port 5173 --host 127.0.0.1`). `apps/web/.env.local` points at Convex dev and `ws://127.0.0.1:2567`.
- Local game server: `node apps/server/dist/index.js` on :2567.
- Debug panels: `?debug=casino` and `?debug=connectivity`. `?preview` shows hidden (unshipped) games in the hub.
- Branch `main` tracks origin. CI is green. This repo's git author email is `abubakrjimoh16488@gmail.com`, which Vercel needs.
- Toolchain: node 25.9 (the repo pins 24.21.0), pnpm 10.34.5, forge 1.7.1, rustc 1.98.1 with the wasm32 target, nixpacks 1.41, docker (OrbStack), and the elevenlabs, 21st, vercel, coolify and convex CLIs. **wasm-pack is not installed** (S06 needs it).

**Last green verification (session 4):**
- `soccer-finish` simulator e2e PASS: 43 rounds, 9.6× woodwork paid exactly. The local RuckusGame is at `0xa513e6e4b8f2a923d98304ec87f64353c4d5c853` with bet types 0–17.
- `soccer-room` PASS (2v2 + watcher + walkout, 163/163 in tolerance). Production: server commit 99a86ee is healthy, and an SDK 1v1 gets 20 Hz snapshots.
- `pnpm verify` passes; web build + budgets pass (shell 150.2 / 155 KB gz). Soccer screenshots at 1280×720 and 844×390 touch 2v2: no console errors; goal → FULL TIME → results/rematch verified.

**Verification (session 3):**
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
