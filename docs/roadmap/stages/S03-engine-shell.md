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
2. [ ] **Engine:** `apps/web/src/engine/`
   - `GameShell` (R3F `<Canvas>` with WebGPURenderer, WebGL2 fallback, GPU tier detection, `?forceWebGL`)
   - `cameraDirector` (attract orbit and play dolly)
   - `gameMachine` (states: attract, entering, play, results, leaving)
   - `scrim` (400 ms crossfade)
   - DPR capping
3. [ ] **App shell:** `apps/web/src/app/`
   - providers (Convex, casino-bridge, i18n)
   - `AppShell` overlay layer (`pointer-events` discipline, vignette)
   - `url-state` (`?game=&room=`)
   - zustand stores (ui, session, settings)
4. [ ] **Games and features:**
   - `games/registry.ts`: eager metadata plus `load: () => import(...)`; entries flagged `hidden` until shipped
   - one placeholder attract scene
   - lazy per-game chunks (Rolldown `codeSplitting` groups keep three/R3F out of the first paint where possible)
5. [ ] **`@arena/audio`:** buses (master, music, sfx, ui), master limiter, first-gesture unlock, iOS `audioSession`, audio sprites, music stem layers, ducking
6. [ ] **`@arena/fx`:** trauma shake, render-only hit-stop clock, particle pool, the diamond-wipe transition, and the payout-tier celebration scaffold
7. [ ] **UI kit:** install shadcn plus 21st.dev components with the **21st-cli-use** and **21st-ui-build** skills (buttons, modal, sheet, tabs, toast, game cards), themed to the Art Bible
8. [ ] **i18n:** a string catalog (`en`), with the host snapshot's `ui.locale` and `ui.theme` respected
9. [ ] **`packages/assets-pipeline`:** scripts for AssetPack atlases, gltf-transform, audio encoding (Opus/WebM plus AAC) with loudness normalisation, and font subsetting. Install KTX-Software `toktx` and ffmpeg if missing.
10. [ ] **CI budgets:** shell ≤150 KB gz; per-game attract ≤1.5 MB; game chunk ≤8 MB

## Acceptance
- The hub loads to an animated attract scene almost instantly: first frame quickly on a mid-range laptop, and Lighthouse performance is good.
- Game switching crossfades, and pressing Play dollies the camera without a screen change.
- It works in the prod-frame harness, and in a hover iframe with no host.
- CI fails if a budget is exceeded.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
