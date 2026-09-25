# 8-Ball Pool Deep Dive: reusable engines, physics, and turning it into a VRF casino game

Date: 2026-09-25. I read the code of both cloned repos end to end: physics, rules, aiming UX, bot, multiplayer, and audio. I checked GitHub for alternatives with `gh search repos` and the `gh api`. Paths are relative to `references/billiards/` (tailuge) or `references/cinematic-8ball-pool/` (cinematic) unless noted.

**TL;DR**
- **tailuge/billiards** has the best web pool physics we can reach, with papers behind the models, fixed-step deterministic simulation, replays, bots, and live multiplayer. It is **GPL-3.0**, and so are its messaging library and scoreboard.
- **cinematic-8ball-pool** looks great: lighting, shadows, and post-processing. Its physics are a toy: no spin, a variable frame step, and axis-aligned clamps. It has **no license**, so we can look at it but not copy any of it.
- No MIT or Apache **JS** engine comes close to tailuge. The best permissive references are **ekiefl/pooltool** (Apache-2.0, Python, event-based, the models tailuge also cites) and **jmqd/billiards** (MIT, Rust with WASM, event-driven, brand new).
- **Recommendation:** write our own MIT/proprietary-clean TypeScript engine from the published papers, porting from pooltool with Apache attribution where we need code. Treat tailuge as a behavioural oracle to test against, and do not fork it. Make the wager a presentation of a VRF-decided outcome, such as a "Break Bank" or a "Run the Table" ladder. Keep skill PvP and vs-bot play unwagered.

---

## 1. Candidates at a glance

| | tailuge/billiards | cinematic-8ball-pool | pooltool | jmqd/billiards |
|---|---|---|---|---|
| License | GPL-3.0 (`LICENSE`, `package.json` "license") | **none, all rights reserved** (README "License") | Apache-2.0 | MIT (dep `jmqd/simul` MIT) |
| Language / runtime | TS, three 0.186.1, webpack, browser and Node | TS, three ^0.181.2, Vite, single 1319-line `src/main.ts` | Python + Panda3D | Rust → WASM browser editor |
| Physics fidelity | High: Han 2005, Mathavan 2010, Alciatore throw, Stronge | Toy | Highest: event-based, many models | High: event-driven, calibrated |
| Determinism | Fixed dt = 2⁻⁹ s + `Math.fround` each step | No: variable dt | Event-based (exact event times) | Event-driven, explicit seeds |
| Rules | 8-ball, 9-ball, snooker, 3-cushion, sagu, "reveal" | 8-ball, local hot-seat | 8/9-ball, snooker, 3-cushion | 9/10-ball, 3-cushion solvers |
| Multiplayer | Yes: nchan pub/sub WS (Render.com) plus lobby, arena, spectate | No | No | No |
| Bot | Ghost-ball heuristics (2 bots) | No | `ai/aim`, `ai/pot` helpers | Search-based solvers plus Gym RL envs |
| Audio | 5 OGG one-shots | none | n/a | n/a |
| Activity | 3,482 commits by tailuge, ≥100 commits in the last 30 days, 253★, 62 forks | 1 author, last commit 2026-07-08 | 407★, active | 1★, very active, created 2025-05 |

Other repos from the GitHub search (none of them change the recommendation):
- **henshmi/Classic-8-Ball-Pool** (MIT, TS, 2D canvas, 72★, stale since 2023). Its physics are toy-grade. The bot idea is worth taking: hill-climbing by simulate-and-evaluate in `src/ai/ai-trainer.ts`, which mutates power and rotation and scores the result with `ai-policy.ts`. Its WAV sounds have unknown provenance.
- **Sacchan-VRC/MS-VRCSA-Billiards** (MIT, C# Udon for VRChat, 71★, active). It has mature 3D physics: collision prediction, substeps, balls on rails, 3D pockets, and 6-red snooker to WPBSA rules. It is a good algorithm reference to port, and it syncs shot inputs.
- **jzitelli/PoolPhysics** (MIT, Python, event-based) and **jzitelli/poolvr** (MIT, three.js + cannon.js, old WebVR).
- **EricDDK/billiards_cocos2d** (Apache, cocos2d-x Lua, frame-sync multiplayer, stale since 2019).
- **w0rm/elm-pool** (no license).
- **Generic engines (rapier/cannon)** are not suitable for pool. They have no rolling/sliding friction model or correct english, and they resolve racks by penetration. Rapier does offer cross-platform determinism (`@dimforge/rapier3d-deterministic`), but the break and spin would feel wrong.

**tailuge sub-packages:**
- `@tailuge/messaging` 1.42.0 is **GPL-3.0** (npm metadata; `tailuge/messaging` package.json:52).
- `tailuge/scoreboard` (Next.js on Vercel) is **GPL-3.0**.
- `tailuge/ballsim` (Java, 2015) has no license.
- **There are no permissively licensed tailuge sub-packages.**

---

## 2. tailuge/billiards: how it actually works

### 2.1 Physics model (`src/model/`)
**State.** Each `Ball` (`model/ball.ts`) has `pos`, `vel`, `rvel` (angular velocity ω) as three.js `Vector3`, and a state: Stationary, Sliding, Rolling, Falling, or InPocket (`ball.ts:13-19`). Physics depends on three.js `Vector3` and imports `BallMesh` (`ball.ts:9,41-47`), so extracting it takes some untangling.

**Time stepping.**
- `Container.step = 0.001953125` (2⁻⁹ s, 512 Hz, `container/container.ts:111`). `advance()` runs `floor(elapsed/step)` fixed steps per rAF (`container.ts:483-491`).
- The leftover fraction is dropped rather than accumulated, so a sim can run marginally slower than wall time. This does not affect results, which never depend on frame rate.
- `timeScale` / fast-forward (`container.ts:97,535`) only changes how many steps run per frame.

**Per step** (`model/table.ts:75-97`):
1. `prepareAdvanceAll(t)` loops, up to a depth of 100, until no collision is predicted inside `t`. It checks each ball pair: if `futurePosition(t)` (a linear extrapolation) overlaps (`collision.ts:7-14`), it resolves the impulse *now* and restarts the loop. It then checks each ball against the cushions, knuckles, and pockets (`table.ts:103-170`). If depth exceeds 100, it throws "Depth exceeded", which is logged with a repro link (`table.ts:79-82`).
2. Each `ball.update(t)`:
   - Rolling balls use trapezium integration (`ball.ts:56-64`).
   - Sliding balls use explicit Euler (`ball.ts:65-69`).
   - The sliding/rolling decision uses the contact-point slip speed `|v + up×Rω| < 0.05` (`ball.ts:127-132`, `physics.ts:12-14`).
3. `ball.fround()` rounds pos.xy, vel.xy, and rvel.xyz to float32 **every step** (`ball.ts:155-163`, `table.ts:84-87`). This is their determinism trick.

**Friction (Han 2005)** (`physics/physics.ts:18-50`):
- Sliding: `v̇ = −μs·g·ûa`, `ω̇ = (5/2)(μs·g/R)·(up×ûa)`, and z-spin decays at `(5/2)Mz/(mR²)`.
- Rolling: `rollingFull` decelerates ω by `(5/7)Mxy/(mR²)` and re-derives v from ω, so rolling stays kinematically consistent (`physics.ts:43-48`). There is an extra fast spin-down when |ωz| > 24 (`physics.ts:34`).
- Constants (`physics/constants.ts:1-40`):

  | Quantity | Value |
  |---|---|
  | μ roll | 0.0055 |
  | μs slide | 0.126 |
  | ρ spindown | 0.045 |
  | m | 0.23 kg |
  | R | 0.03275 m |
  | Mathavan cushion e | 0.85 |
  | μs table / μw cushion | 0.2 / 0.175 |
  | `maxPower` | 160R (≈5.2 m/s) |
  | `offCenterLimit` | 0.45R |

- Everything can be overridden from URL params (`utils/physicsparams.ts`, `browsercontainer.ts:120`).

**Cue strike** (`physics.ts:228-265`):
- Speed is `power·(1 − 0.25·|offset|²)`.
- Spin comes from Dr Dave TP A-12: `ω = (5/2)·v·(offset·R)/(R²·cos α)`, about an axis rotated by the tip-offset angle and tilted by elevation, which gives massé and jump-like spin.
- **Squirt is visual only.** The cue mesh rotates by up to 0.5° (`view/cue.ts:253-265,366-371`), but the ball leaves along `aim.angle`.
- The first shot of 8-ball, 9-ball, and reveal gets **×1.2 power** as a break boost (`controller/aim.ts:117-127`).

**Ball-ball** (`physics/collisionthrow.ts`, from Alciatore TP A-14):
- Contact positions come from solving the quadratic for exact touch time (`collision.ts:25-51`).
- Normal impulse uses e = 0.925 (`collisionthrow.ts:36,52`).
- Tangential impulse is `min(μ(v)·|Jn|, m·vrel/7)`, with `μ(v) = 0.01 + 0.108·e^(−1.088·v)` (`collisionthrow.ts:25-27,56-64`). This models **throw** (cut-induced and spin-induced) and spin transfer.
- Both balls get the same angular impulse (`collisionthrow.ts:81-94`), and ball z-velocity is zeroed. Balls never leave the cloth except when falling into a pocket.

**Cushions** (`physics/cushion.ts`, `physics.ts:72-218`, `physics/mathavan.ts`, `physics/stronge.ts`):
- Cushions are **4 axis-aligned lines**, split at the pocket knuckles (`cushion.ts:72-135`). Each bounce rotates the ball into a canonical frame, applies the chosen model, and rotates back (`physics.ts:61-70`, `cushion.ts:137-148`).
- Available models:
  - `bounceHan` (Han 2005, grip/slip)
  - `bounceHanBlend` (tailuge's blend, which removes the grip/slip discontinuity; `physics.ts:166-178`)
  - `mathavanAdapter`: Mathavan 2010, an iterative impulse integration over compression and restitution. It uses N = 100 sub-impulses and throws after 1000 (`mathavan.ts:79-100,146-164`), with the contact at `sinθ = 2/5` (`constants.ts:35-37`).
  - `strongeAdapter`: Stronge compliant, three slip regimes.
- **The live game defaults to Mathavan**: `browsercontainer.ts:128-140` returns `mathavanAdapter` when there is no `cushionModel` param and sets it at `:258`. `Table`'s own default is `bounceHanBlend` (`table.ts:34`), which applies in tests and headless use.

**Knuckles and pockets:**
- Knuckles (the pocket jaw points) are circles. The bounce reflects the normal velocity with `e` and **halves spin** (`physics/knuckle.ts:19-25`). Geometry is in `view/pocketgeometry.ts:28-36`, where the corner mouth radius is 2.2R and the middle is 1.8R.
- A ball is **potted** when its centre enters the pocket circle. It then falls with gravity, a centring force, and a rim bounce (`physics/pocket.ts:15-56`).
- There are no angled pocket facings and no rail tops. The table is 86R × 42R for the 8-ball default (`view/tablegeometry.ts:15-16`), about a 7-8 ft table.

**Determinism in practice:**
- Multiplayer and replays depend on bit-identical lockstep. A remote client re-simulates each shot from the cue-ball position plus aim (§2.4).
- `test/bug/bug.md` documents a real `remote_hit_pre_apply_desync` in 9-ball, with a regression test in `test/bug/break_replay_regression.spec.ts`. So the approach **mostly** works but does desync.
- Why it can desync:
  - `Math.sin/cos/atan2/exp/hypot/pow` are *implementation-approximated* by the ECMAScript spec. tailuge wraps them in `Math.fround` (`utils/utils.ts:16-42`), which hides most ULP differences but not ones on a rounding boundary.
  - `Ball.id` is a global static counter (`ball.ts:30-31`). Tests reset it with `Ball.id = 0`, and serialisation indexes `balls[b.id]` (`table.ts:212-215`).
  - Rack jitter uses `Math.random()` (`utils/rack.ts:12,42-54`). This is where we would plug in the VRF seed.

**Accuracy versus performance:**
- The README claims about 500 full rollouts per second on 4 cores (TS, Web Workers or Node; `src/worker.ts`, `dist/ww.html`).
- Collision checking is O(n²) pairs × 512 Hz (120 pairs for 16 balls) with a discrete lookahead, which is fine for pool.
- Mathavan runs about 100 or more iterations per cushion hit, using trig.
- There is a trajectory-fitting page for tuning constants against real shots (`dist/fit/`).

### 2.2 Rendering, camera, aiming UX (`src/view/`)
**Rendering:**
- Stock three.js `WebGLRenderer` (`utils/webgl.ts`). Lighting is essentially an `AmbientLight` (`view.ts:168`) plus baked or phong materials from Blender glTF (`dist/models/p8.min.gltf` 8 KB + `.bin` 32 KB; `.blend` sources are shipped).
- Shadows are **fake discs** under each ball (`ballmesh.ts:45-61,108`) and a plane under the cue (`cue.ts:285-299`). There is no shadow map, bloom, or tone mapping.
- Ball materials are `MeshPhysicalMaterial` at higher LOD (`ballmaterialfactory.ts:21-30`). Number and stripe textures are procedural canvas (`balltexturefactory.ts`, `ballcubetexturefactory.ts`), and cue wood grain is a procedural seeded canvas (`cuemesh.ts:488`).
- Particles for pots (`particle-system.ts`), traces (`trace.ts`), minimap, and emoji portraits. The look is functional rather than premium.

**Camera** (`view/camera.ts`):
- Modes: `aimView` (behind the cue, fov 40, or 60 in portrait), `aimzView` (lerped), `topView` (`cameratop.ts` fov 20), and `spectatorView` (`camera.ts:44-45,119-136,267-320`).
- While watching, the camera randomly picks top or aimz view (`controller/watchaim.ts:18`).

**Aim, power, and spin input:**
- **Keyboard:** arrows aim (Ctrl for fine), up/down for top/back spin, Shift+left/right for side spin, hold Space for power, M for elevation (`controllerbase.ts:102-140`, `aim.ts:67-82`).
- **Mouse and touch:** `interactjs` drag and gesture rotate the aim; a vertical drag changes camera height (`events/keyboard.ts:74-111`). The wheel sets power.
- **Drag-to-strike** (`view/cuehit.ts`): pull the 3D cue back and push it forward. Forward pointer speed maps to power (2400 px/s = 100%; below 120 px/s cancels; 5% minimum; `cuehit.ts:21-36`). A 4× fat invisible hit zone makes touch easier (`cuemesh.ts:64-66`).
- **Drag on the cue ball to set spin** (`view/cueballspin.ts`). There is also a 2D DOM spin ball, a power slider, and a tilt control (`view/dom/aiminputs.ts`).
- A **shot clock** auto-fires after 20 s by default, 10 s in "berserk" mode (`aiminputs.ts:58-75`).
- `avoidCueTouchingOtherBall` raises the tip offset, then elevation, when the cue would clip a ball (`cue.ts:192-213`).

**Aim guides:**
- During live play there is only a translucent straight cylinder about 60R long (`cuemesh.ts:79-133`, toggled with A) plus a DOM "object ball overlap" indicator (`utils/overlap.ts`).
- There is **no** ghost ball or predicted object-ball line in normal play. A full simulated preview (`model/previewshot.ts`, which runs the real step) exists only in the analysis and drill panels.
- `freeaim=true` hides the helper (`container.ts:182-189`).

**Mobile:**
- It works on phones: portrait mode, `portraitplacements.ts`, and wrappers for Android and Tauri (README "Install").
- `PlayShot` posts `{type:"stationary", outcome, table}` to `parent` when embedded (`playshot.ts:53-62`), and there is an `embed.html`. That is an iframe integration hook.

### 2.3 Rules (`src/controller/rules/`)
Rule sets: `eightball.ts` (373 lines), `nineball.ts`, `snooker.ts` (+`snookerscoring/utils`, plus a WIP `newrules/`), `threecushion.ts`, `sagu.ts`, `reveal.ts`, `drill.ts`, and `rulefactory.ts`. The `Rules` interface is in `rules.ts`.

**8-ball** (`eightball.ts`):
- Rack order comes from swaps (`rack.ts:300-308`), with random µ-jitter.
- The cue ball goes behind the baulk/head line on the first shot (`eightball.ts:89-103`).
- Fouls (`:170-207`): cue ball potted, no ball hit, wrong group first, 8 first on an open table or before clearing the group, and no cushion after contact when nothing is potted.
- Foul gives ball in hand anywhere (`:224-256`).
- Groups are assigned on the first clean pot of a single group (`:270-280`).
- The turn continues only if the shooter pots their own group (`:304-312`).
- An 8 potted early without a foul is **re-spotted** and treated as a foul (`:264-268,315-325`), which is not WPA loss-of-game.
- An 8 potted on a foul loses the game if the group is not assigned or already cleared; otherwise it is respotted (`:236-245`).
- A legal 8 wins (`:338-363`).
- There is no call-pocket rule.

**Turn logic** is a controller state machine: `Init → PlaceBall/Aim → PlayShot → (rules.update) → Aim|WatchAim|PlaceBall|End` (`controller/*.ts`, `playshot.ts:23-77`). Events are processed only when every ball is stationary (`container.ts:519-527`).

### 2.4 Multiplayer (`src/network/`, `@tailuge/messaging`)
**Transport:**
- The lobby, presence, challenges, and tables use `@tailuge/messaging`, a GPL client over an **nchan (nginx) pub/sub server**: WebSocket subscribe plus HTTP POST publish, with heartbeats, reconnect, dedupe by `msgId`, and a bounded outbox (`network/client/messagingmessagerelay.ts:6-20`; tailuge/messaging `MESSAGING_SPEC.md`, `docker/nchan.conf`).
- The server is `wss://billiards-network.onrender.com` (`network/client/constants.ts:21`), a Docker nginx+nchan on Render with an njs arena API (`docker/api.njs`).
- The static site is on Cloudflare Workers (`billiards.tailuge.workers.dev`). Results go to `scoreboard-tailuge.vercel.app/api/match-results` (`scorereporter.ts:7,19`).
- **No Durable Objects and no authoritative server.** Clients self-report results.

**What is synced (input lockstep):**
- `AimEvent` streams are throttled to 250 ms (`container.ts:209-216`).
- A `HitEvent` carries only the **cue-ball position + aim {angle, power, offset, elevation}** (`table.ts:196-204`, `events/hitevent.ts`). The watcher sets those values and **re-simulates locally** (`watchaim.ts:40-45`, `watchshot.ts:17-22`).
- The shooter's client runs the rules and broadcasts `ScoreEvent`, `PlaceBallEvent`, `StartAimEvent`, `WatchEvent`, and `RerackEvent`. Watchers accept the shooter's scores, so the shooter is authoritative (`controllerbase.ts:48-79`, the snooker comment at `:70-72`).
- The full table is sent on `Begin` (`init.ts:50`) and after pots (`eightball.ts:311`), but the watcher does not re-apply positions on WATCH (`watchshot.ts:76-84`). That makes it effectively pure lockstep.

**Replay:**
- `Recorder` (`events/recorder.ts`) stores `init` (flattened xy) plus shot AimEvents. Replays are encoded into shareable URLs (deflate + base64 in `utils/replay-codec.ts`, with a JSONCrush fallback) and played back by `controller/replay.ts`.
- There is resume after reload (`utils/resumestore.ts`, `container/resumehandler.ts`), spectating (`controller/spectate.ts`), and hourly lichess-style arenas (`dist/arena.html`).

### 2.5 Bots (`src/network/bot/`)
- `BotRelay` is an **in-browser fake network relay** (`botrelay.ts:14-16`, 500 ms queue and 300 ms sequence delays). `BotEventHandler` reuses the container's rules and table (`boteventhandler.ts:66`).
- `AimCalculator` (`aimcalculator.ts`) uses **ghost-ball geometry**: it picks the pocket with the smallest cut angle (`:105-129`), places the ghost ball at 2.001R behind the object ball on the pocket line (`:134-143`), and adds optional angle noise and random vertical spin (`:77-100,149-154`). It does **not** simulate.
  - **ClawBreak** hits the nearest valid ball at default power (`strategies/clawbreak.ts`).
  - **TheFarJaw** aims at the far pocket knuckle at max power with draw (`strategies/thefarjaw.ts:53-71`).
- Difficulty is fixed, and the bots are beatable. `worker.ts` and `sensitivity.ts` show that a simulation-search bot is feasible (about 500 rollouts per second).

### 2.6 Audio (`src/view/sound.ts`, `dist/sounds/`)
- Five tiny OGG files, 5-10 KB each: `ballcollision`, `cue`, `cushion`, `pot`, `success`. Each is a single `THREE.Audio` on the camera's `AudioListener`, so the sound is non-positional (`sound.ts:18-40`).
- Volume and detune scale with impact speed (`sound.ts:76-100`).
- **At most one sound per frame** (the `break` in `processOutcomes`, `sound.ts:113-121`), and each sample is stopped and restarted, so breaks lose most clicks.
- There is no rolling-cloth loop and no pocket rattle.
- The sounds date from 2021-2023 commits. Their provenance is undocumented, so they are GPL by inclusion.

### 2.7 Asset inventory (all under the repo GPL-3.0; no separate asset licenses)
- `dist/models/`: `p8`, `snooker`, `threecushion`, and `background` as `.gltf/.bin/.min.*` plus `.blend` sources.
- `dist/sounds/*.ogg` (5 files).
- `dist/images/*`, `dist/assets/*.png` (icons, promo art), and `dist/css`.
- Procedural textures in code (ball numbers, dots, cue wood).

---

## 3. cinematic-8ball-pool (reference for the look only)
- **Stack:** three ^0.181.2, `EffectComposer` → `RenderPass` → `UnrealBloomPass(0.23, 0.55, 0.78)` → a custom vignette `ShaderPass` → FXAA (`src/main.ts:4-8,200-230`). `ACESFilmicToneMapping`, exposure 1.5, `PCFSoftShadowMap`, sRGB output, `FogExp2` (`main.ts:180-198`).
- **Lighting rig** (`main.ts:505-560`): a Hemisphere light, an Ambient light, a key `SpotLight` (intensity 200, 2048² shadow map, bias −0.00015, normalBias 0.02), a warm wash DirectionalLight, a cool fill, a rim DirectionalLight with a 2048² shadow, and a second spot. Room pendants use `PointLight`s (`:408`).
- **Materials:** `MeshStandardMaterial` everywhere. Canvas noise textures give the felt and wood, and ball textures are procedural (`:279-370`). The table is built from primitives (`buildTable`, `:416-503`).
- **Physics are a toy.**
  - Substeps are ≤1/180 s, but the frame dt is clamped to 0.05 and **varies** (`:800-809`), so results depend on frame rate.
  - Friction is linear `speed − 0.92·dt` (`:811-825`). There is **no spin or english**.
  - Cushions are AABB clamps with restitution 0.82 (`:838-862`). Pockets are circles (`:93-100`).
  - Collisions use position correction plus a normal-only impulse with e = 0.94 (`:879-915`).
  - `window.__POOL_GAME__.step(frames, dt)` gives deterministic QA only when dt is fixed (`:1305`).
- **Rules** (`resolveShot`, `:929-1024`): open table, groups, fouls (scratch, no contact, wrong first ball), and loss on an early 8.
- **UX:** mouse-hover aim, hold Space or the mouse to charge, an aim line plus a ghost ring (`:640-665`), a smoothed follow camera (`:1100-1118`), and mobile Aim ± and Shoot buttons (`:1252-1270`).
- It has no audio, no network, and no bot.
- **License: none**, so it is all rights reserved. We can take ideas such as the rig values and post chain, not code.

---

## 4. GPL-3.0: what forking tailuge would mean for us

1. **Serving a JS bundle to browsers conveys object code.** Any client bundle that includes or derives from tailuge code, including its physics, must be offered under GPL-3.0 with Corresponding Source (GPL §4-6). That covers our whole game frontend, since it is one combined program.
2. **Things that are not infected:**
   - The Chain.wtf **host** that iframes us over postMessage is a separate program at arm's length.
   - Our **Solidity contract** is an independent work.
   - **Server-side** code (for example a Durable Object that re-simulates shots with GPL physics) does not trigger source release, because GPL-3.0 is not AGPL and running it on a server is not conveying.
3. **Jam submission with public source:** compatible, *if* we license our frontend GPL-3.0.
   - **Blocker:** we bundle `@chain/casino-sdk` into the client, and `casino-sdk/` declares **no license** (there is no LICENSE file or `license` field in `casino-sdk/package.json`). We cannot re-license it under GPL, so a combined GPL work that includes it is arguably non-compliant.
   - Workaround: isolate the GPL pool renderer as a *separate program*, such as its own page or iframe, talking to the SDK shell over postMessage. That is legally murkier and costs latency and complexity.
4. **Later commercial integration (25% rev-share):** GPL permits commercial use and revenue share. However:
   - We cannot stop Chain or competitors from forking our client.
   - We cannot ship proprietary client components such as paid skins or closed anti-cheat.
   - Chain would inherit the same obligations if it redistributes the client.
   - Relicensing needs every copyright holder: tailuge wrote about 88% of commits, the `google-labs-jules[bot]` 449, velikodimov 24, and a few others. **Buying an exception from tailuge is possible, but it is a dependency on one person.**
5. **Options:**
   - **(a) Reference-only, write our own (recommended).** Algorithms and equations are not copyrightable. Implement them from the primary sources below, and port from **pooltool (Apache-2.0)** where we need code, keeping its NOTICE and attribution. Constants are physical measurements from the papers. Do not copy tailuge code text or structure. Keep tailuge as a black-box oracle: compare our trajectories against its live site or headless worker in tests. (We have read the code, so "clean room" is not literal. Deriving from papers and pooltool rather than tailuge source is the defensible line.)
   - **(b) Separate GPL pool module** in its own iframe or program, with the rest of our code proprietary. Workable but awkward. It still ties the core experience to GPL and to the SDK licensing ambiguity.
   - **(c) Fork everything GPL.** Fastest, but it has the SDK-license problem and gives up commercial flexibility.
6. **Sources to implement from:** the same papers tailuge cites in its README "Reference material".
   - **Han 2005**, *Dynamics in carom and three cushion billiards* (billiards.colostate.edu/physics_articles/Han_paper.pdf), with **Kiefl's corrections** (ekiefl.github.io/2020/04/24/pooltool-theory).
   - **Mathavan et al. 2010**, IMechE, *A theoretical analysis of billiard ball dynamics under cushion impacts* (Mathavan_IMechE_2010.pdf).
   - **Alciatore TP A-14** (ball-ball throw), **TP A-12** (cue tip → spin), **TP B-17** (max spin), and TP B-6.
   - **Stronge**, *Impact Mechanics* (doi 10.1017/9781139050227).
   - Leckie & Greenspan 2006 (event-based pool simulation), as used by pooltool.
   - Pooltool physics docs and code: `pooltool/physics/resolve/{ball_ball/frictional_inelastic, ball_cushion/han_2005, mathavan_2010, stronge_compliant, stick_ball/instantaneous_point}` and `pooltool/evolution/event_based`.

---

## 5. What is reusable, and the determinism recipe for our own engine

**What we can take (as ideas or as a test oracle, not code):**
- The model mix: Han friction, Alciatore throw, Mathavan cushions, knuckle circles, fixed 2⁻⁹ dt with an exact-contact quadratic.
- Input lockstep: the HIT carries cue-ball position and aim only.
- Replay URLs made of init plus shots.
- The drag-to-strike gesture tuning numbers (`cuehit.ts:21-36`).
- The ghost-ball bot geometry (`aimcalculator.ts:105-143`).
- The iframe `postMessage` outcome hook.

**Determinism recipe for our engine** (needed for PvP lockstep, server verification, and replaying a VRF-chosen outcome):
1. Use **float64 and only IEEE-exact operations** (`+ − × ÷ sqrt`). Never use `Math.sin/cos/atan2/exp/hypot/pow` inside the simulation.
   - In Mathavan, tailuge computes `φ = atan2(...)` and then `sin(φ)`, `cos(φ)` (`mathavan.ts:61-75`). These are simply `v_y/s` and `v_x/s`, so no trig is needed.
   - Replace `hypot` with `sqrt(x² + y²)`.
   - Use a fixed polynomial `exp` for the throw friction.
   - Precompute the few constant trig values.
   - This gives bit-identical results in V8, JSC, and SpiderMonkey, and inside a Cloudflare Worker.
2. Use a fixed dt (2⁻⁹ or 2⁻¹⁰) with an exact time-of-impact sub-step. Alternatively go event-based as pooltool does, which is more exact but needs careful quartic root-finding.
3. Keep no global mutable counters or `Math.random`. All randomness (rack micro-gaps, bot noise, and the VRF-driven execution noise) comes from a seeded PRNG keyed off the VRF `bytes32`.
4. Hash the state after each shot so the two peers and the server can compare. On mismatch, the authoritative (server) state wins.
5. Keep the simulation in a pure module with no three.js and no DOM, so it runs in Web Workers, Node, and Durable Objects. The renderer interpolates recorded keyframes.

---

## 6. Premium quality bar (combine the best of both)
- **Physics feel:** tailuge-grade models, plus angled pocket facings and jaws (pooltool has linear and circular cushion segments), **real squirt** (it is visual-only in tailuge), and a pocket rattle.
- **Look:** cinematic-style ACES tone mapping, shadow-mapped key and rim lights, bloom and vignette, PBR felt and wood, and clearcoat balls. Build the table model ourselves in Blender.
- **Aiming:** drag-to-strike and drag-spin, as tailuge does. Add a ghost ball plus a short object-ball and cue-ball tangent guide (a casual difficulty option), and a camera that follows the lead ball.
- **Audio:** WebAudio with a **voice pool**, so no clicks are dropped on the break. Gain, pitch, and low-pass follow the impact speed, and stereo pan follows table x. Separate samples for tip-on-ball (chalk), clack variants, cushion thud, pocket drop plus gully roll, and a cloth-roll loop driven by total kinetic energy. Use CC0 or self-recorded sources.
- **Bot:** simulate-and-search in a Worker. Generate candidate (target, pocket) shots with ghost-ball geometry, sample the spin and power grid, and score by pot probability under execution noise plus cue-ball position for the next shot. Tier difficulty by noise σ. henshmi's hill-climb and jmqd's solvers are useful references.
- **PvP rooms:** a Cloudflare Durable Object per table (WebSocket hibernation). It relays inputs, re-simulates each shot authoritatively, sends state hashes, handles spectators and reconnect, and stores replays.

---

## 7. From a pool round to a casino wager (Chain SDK constraints)
Jam rules (`CLAUDE.md`, `casino-sdk/docs/CONTRACT_CONSTRAINTS.md`):
- Every outcome comes from VRF `bytes32` via rejection sampling.
- **RTP must be 93-98%.**
- Contract step handlers are `view` (they cannot run a physics simulation).
- Payouts go through one function and are capped at `escrowedStake + reservedProfit`.

**The skill-versus-fixed-RTP conflict:**
- If a payout depends on how well the player aims, RTP depends on the player. A strong player, or a script driving the deterministic engine, gets over 100%, and a deterministic bot is exploitable.
- So **in a wagered round the physics must present a VRF-decided outcome**. Skill-determined wagering (PvP stakes or beating the bot for money) does not fit `ICasinoGameV2`. It would need a separate PvP escrow with an authoritative-server oracle and signed results, and it raises skill-gaming legal questions. That is out of scope for the jam.

**Designs that fit:**
1. **Break Bank (instant):**
   - The player bets and picks cue-ball placement, power, and spin.
   - The contract draws an outcome class from the VRF using a paytable: 0-7 balls potted, "8 on the break" as the jackpot, and scratch as a push or loss.
   - The client **realises** the class. Starting from a PRNG seeded by the VRF, it searches the *rack micro-gaps* (1-3 µm, physically legitimate chaos) until the deterministic simulation produces exactly that class. The player's stroke is honoured exactly.
   - Rare classes (for example 8-on-break) fall back to a precomputed library of breaks per class, with the library hash committed in the contract or manifest.
   - Anyone can re-verify: the VRF seed, the player input, and the search give the same trajectory.
2. **Run the Table (multi-action, mines-style ladder):**
   - After the break, each turn the player *calls* a shot (object ball plus pocket). The client prices it into an EV-neutral tier, for example straight-in p = 0.77 at 1.25×, a cut at 2×, a bank at 5×, a kick at 12×. The tier goes in `actionData`.
   - The contract does not need to verify geometry, because every tier has the same EV.
   - The VRF decides make or miss. The client searches seeded execution noise around the player's exact aim, finding either a make or a dramatic jaw-rattle miss.
   - Accrued multiplier = `RTP × Π(1/pᵢ)`. The player can **cash out** at any point: `quoteForfeitPayout` is legitimate here because the value is fully determined by revealed state. A legal 8-ball adds a bonus.
3. **Side bets:** "call your shot" or "≥3 on the break" as instant VRF bets, including for spectators of a friends room. They settle on the VRF, not on the real shot.
4. **Non-wagered skill modes** (this is where the fun and the "10h still playing" factor live): friends rooms and vs-bot, with leaderboards, arenas, and replays. They can feed cosmetics and tournaments without house-backed RTP.

**UX honesty:** say clearly that "the cloth decides". Aim chooses the shot and the odds tier, and the VRF decides the result. It is the same framing as choosing a mines count.

---

## 8. Key file index (tailuge)

**Physics**
| Location | What |
|---|---|
| `src/model/physics/physics.ts:18-50` | Friction |
| `physics.ts:149-218` | Cushion models |
| `physics.ts:228-265` | Cue strike and spin |
| `collisionthrow.ts:21-97` | Ball-ball throw |
| `collision.ts:25-51` | Contact time |
| `mathavan.ts:79-164` | Mathavan cushion solver |
| `constants.ts:1-40` | Constants |
| `model/table.ts:75-170` | Step and collision loop |
| `ball.ts:52-132,155-163` | Integration and fround |
| `pocket.ts`, `knuckle.ts`, `cushion.ts` | Pockets, knuckles, cushions |
| `container/container.ts:111,483-550` | Fixed step and main loop |
| `browsercontainer.ts:128-140` | Default cushion model = Mathavan |

**Rules and flow**
| Location | What |
|---|---|
| `controller/rules/eightball.ts` | 8-ball rules |
| `aim.ts:113-132` | Break ×1.2, HIT send |
| `playshot.ts:23-77` | Rules update, iframe postMessage |
| `watchaim.ts:40-45` | Remote re-simulation |
| `utils/rack.ts:12-54,300-308` | Rack and jitter |

**UX**
| Location | What |
|---|---|
| `view/cue.ts:100-213,253-265` | Aim, spin, and power; visual squirt |
| `cuehit.ts` | Drag-to-strike |
| `cueballspin.ts` | Drag spin |
| `dom/aiminputs.ts:58-75` | Shot clock |
| `camera.ts` | Camera modes |
| `cuemesh.ts:79-133` | Aim helper |
| `utils/overlap.ts` | Overlap indicator |
| `model/previewshot.ts` | Full preview |

**Network, bot, audio**
| Location | What |
|---|---|
| `network/client/messagingmessagerelay.ts` | Messaging relay |
| `constants.ts:21` | nchan server URL |
| `table.ts:196-204` | HIT payload |
| `container.ts:209-216` | 250 ms throttle |
| `utils/replay-codec.ts` | Replay encoding |
| `network/bot/aimcalculator.ts` | Ghost-ball aim |
| `strategies/*.ts`, `botrelay.ts` | Bot strategies and relay |
| `view/sound.ts:76-121` | Audio |

**Headless use:** `src/worker.ts`, plus `test/bug/*` for the desync case.
