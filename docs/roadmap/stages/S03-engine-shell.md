# S03: Engine shell, asset pipeline, brand (✱N)

**Goal:** the hub feels alive. There is one persistent canvas, and each game has an attract mode (a placeholder scene for now) and a camera-dolly "play" transition. The brand and name are decided, and the asset pipeline and performance budgets are enforced.

**Read first:**
- `docs/research/deep/xray-games.md` ("key trick" plus motion)
- `game-feel-audio-ux.md` §1, §3 and §4
- `tech-stack.md` §3, §4 and §7
- ADR-006 and **`docs/research/deep/asset-sources.md`**
- context7 docs: three.js WebGPURenderer/TSL post-processing, R3F 9, zustand 5, Motion

## Tasks
1. [x] **✱N Name and brand.** Done: direction A, Arcade Cabinet, is recorded in `docs/assets/ART-BIBLE.md`. The comparison artifact is https://claude.ai/artifact/5N3ouNtD9vLWUNiBaZwGiJ.
   - The name is decided: **RUCKUS** (gameId `ruckus`).
   - Use the **21st-ui-explore** skill to show 2–3 distinct brand directions.
   - The user picks one. Write `docs/assets/ART-BIBLE.md`: palette tokens (gold reserved for money), type (display + body fonts, tabular numbers), button language, iconography (Phosphor), motion rules and audio identity.
2. [x] **Engine:** `apps/web/src/engine/`
   - `GameShell` (R3F `<Canvas>` with WebGPURenderer, WebGL2 fallback, GPU tier detection, `?forceWebGL`)
   - `cameraDirector` (attract orbit and play dolly)
   - `gameMachine` (states: attract, entering, play, results, leaving)
   - `scrim` (400 ms crossfade)
   - DPR capping
3. [x] **App shell:** `apps/web/src/app/`
   - providers (Convex, casino-bridge, i18n)
   - `AppShell` overlay layer (`pointer-events` discipline, vignette)
   - `url-state` (`?game=&room=`)
   - zustand stores (ui, session, settings)
4. [x] **Games and features:**
   - `games/registry.ts`: eager metadata plus `load: () => import(...)`; entries flagged `hidden` until shipped
   - one placeholder attract scene
   - lazy per-game chunks (Rolldown `codeSplitting` groups keep three/R3F out of the first paint where possible)
5. [x] **`@arena/audio`:** buses (master, music, sfx, ui), master limiter, first-gesture unlock, iOS `audioSession`, audio sprites, music stem layers, ducking
6. [x] **`@arena/fx`:** trauma shake, render-only hit-stop clock, particle pool, the diamond-wipe transition, and the payout-tier celebration scaffold
7. [x] **UI kit:** install shadcn plus 21st.dev components with the **21st-cli-use** and **21st-ui-build** skills (buttons, modal, sheet, tabs, toast, game cards), themed to the Art Bible
8. [x] **i18n:** a string catalog (`en`), with the host snapshot's `ui.locale` and `ui.theme` respected
9. [x] **`packages/assets-pipeline`:** scripts for AssetPack atlases, gltf-transform, audio encoding (Opus/WebM plus AAC) with loudness normalisation, and font subsetting. Install KTX-Software `toktx` and ffmpeg if missing.
10. [x] **CI budgets:** shell ≤150 KB gz; per-game attract ≤1.5 MB; game chunk ≤8 MB

## Acceptance
- The hub loads to an animated attract scene almost instantly: first frame quickly on a mid-range laptop, and Lighthouse performance is good.
- Game switching crossfades, and pressing Play dollies the camera without a screen change.
- It works in the prod-frame harness, and in a hover iframe with no host.
- CI fails if a budget is exceeded.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits

## Notes (session 2, 2026-09-25)
- **Engine** (`apps/web/src/engine/`): one R3F `<Canvas>` on `WebGPURenderer` (auto WebGL2 fallback, `?forceWebGL`), loaded as a lazy chunk after the DOM hub paints and faded in on `onCreated`. `gameMachine` (zustand) guards transitions with a table; `select()` awaits the game chunk *before* the 400 ms scrim crossfade so the scrim never lifts onto an empty stage. `CameraDirector` orbits (0.02π rad/s, zoom 1.25) and dollies (1.1 s easeInOutCubic) into the rig's play pose, reporting arrival to the machine; reduced motion swaps the dolly for a scrim cut. `lensShift` (camera.filmOffset) lets the attract subject sit beside the menu while still orbiting its own centre.
- **GPU tier decision:** no `detect-gpu` (it fetches a benchmark table from a CDN before first frame). `AdaptiveDpr` measures real frame time over 90-frame windows and steps DPR in 0.25 between 1 and min(devicePixelRatio, 1.75).
- **Placeholders:** `WelcomeScene` (four glowing arcade cabinets) and a Chickenz diorama (960×540 map in 16 px tiles, bobbing cube chickens) until S07. Chickenz stays `hidden: true`; `?preview` shows hidden games.
- **App shell:** `AppShell` overlay (pointer-events none, controls opt in, vignette), url-state (`?game=&room=`, replaceState only), stores (ui, session, settings persisted via guarded localStorage).
- **Audio:** `@arena/audio` AudioEngine (music→duck, sfx, ui → master → limiter), unlock on first gesture + `audioSession='playback'` + visibility resume, sprites with `~n` round-robin variants, voice stealing, cooldowns, synced stems, ducking. Hub UI sprite from ElevenLabs (prompts in `assets-src/hub/ui/PROMPTS.md`); one take came back silent, so the builder now refuses silent regions.
- **Assets pipeline:** `audio-sprite` done (trim, loudnorm -20 LUFS / -1 dBTP, Opus/WebM + AAC/M4A + JSON map, emitted into `src/assets` so Vite hashes them). Fonts: @fontsource ships unicode-range subsets, which is the subsetting we need. **Deferred to first use:** texture atlases (S07, Chickenz sprite sheets are already atlases) and gltf-transform/KTX2 (S13 pool); `toktx` is not installed yet.
- **UI kit:** shadcn primitives (dialog, sheet, tabs, slider, switch, sonner) with brand token aliases; lucide/next-themes/`cn` junk that the shadcn CLI pulled was removed. Button is adapted from 21st.dev Pop Button with the Art Bible lip press.
- **Budgets:** `pnpm -F @arena/web budgets` (in CI after build): shell 143.7 KB gz / 150, chickenz attract 428 KB gz / 1.5 MB, game chunk 1.33 MB / 8 MB. The shell got under budget by lazy-loading the casino bridge (zod/viem/penpal), `LazyMotion` features, the settings sheet and the toaster.
- **Verified:** `pnpm verify`; `prod-frame` now also boots the real hub framed (demo balance + canvas); manual check of attract → dolly → back and game switch in Chrome (WebGPU).
