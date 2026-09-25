# Tech Stack: Premium Browser Multiplayer Arena Hub (2026)

Researched 2026-09-25. Covers a hub with a 2.5D platformer shooter (Chickenz-style), 3D 8-ball pool, physics soccer (Eggy League / Rocket-League-lite) and possibly a racer. Hard constraints: static frontend that runs standalone and inside the Chain.wtf iframe (`sandbox="allow-scripts allow-same-origin"`), guest-first identity, bots mixed with friends, and money settled on-chain through `@chain/casino-sdk` (Base, VRF).

Sources: context7 docs (Colyseus 0.18, Rapier, three.js, R3F, Cloudflare Durable Objects, Convex Auth, Better Auth, SpacetimeDB), `gh api` and `npm view` (stars, pushes and versions checked 2026-09-25), web search, and the local references (`references/chickenz`, `references/billiards`, `casino-sdk/docs`).

---

## 0. TL;DR stack

| Layer | Pick | Runner-up |
|---|---|---|
| Realtime rooms / netcode | **Colyseus 0.18** (built-in prediction, rollback, interpolation, lag-comp rewind, queue matchmaking), self-hosted on Fly.io in 3 regions or on Colyseus Cloud | Cloudflare Durable Objects + PartyServer (turn-based and meta only) |
| Meta backend (identity, leaderboards, tournaments, replays, friends) | **Convex** + `@convex-dev/auth` Anonymous provider + `@convex-dev/aggregate` + `@convex-dev/rate-limiter` | Supabase (anonymous sign-ins) / Better Auth anonymous plugin |
| Shared game sim | **Pure TypeScript `packages/sim-*`**: fixed-step, seeded PRNG, no `Math.sin/cos/pow` in the sim. The same code runs on server, client prediction, bots, replays and verification | Rust to WASM (the Chickenz approach), only if you need ZK proofs |
| 3D physics | **`@dimforge/rapier3d-deterministic-compat` 0.21** (soccer, racer) | Jolt (`jolt-physics` 1.1, built with CROSS_PLATFORM_DETERMINISTIC) if vehicles need a real wheel model |
| 2D physics (shooter) | **Custom fixed-point AABB platformer sim** (the proven Chickenz design) | `@dimforge/rapier2d-deterministic-compat` |
| Pool physics | **Custom event-based analytic ball physics** (Han 2005 / Mathavan 2010 models, as in tailuge/billiards) | Rapier (not recommended: spin, throw and cushion models are wrong for pool) |
| Rendering | **three r186 `WebGPURenderer` (auto WebGL2 fallback) + React Three Fiber 9.8 + drei 10**, with TSL `RenderPipeline` post-FX. One renderer for every game, the 2.5D shooter included | PixiJS v8 for the shooter if it goes pure 2D pixel art |
| Assets | glTF-Transform → Meshopt + KTX2 (UASTC/ETC1S), per-game code-split chunks, lazy WASM | Draco (slower decode than Meshopt) |
| Audio | **Thin custom Web Audio engine** (buses, sprites, stem layering, ducking) + `THREE.PositionalAudio` on the same `AudioContext` | Howler 2.2.4 (stable but untouched since 2023) |
| Bots | Server-side "virtual seats" that emit inputs through the same input API as humans. Utility AI + steering (shooter, soccer), shot enumeration + Monte-Carlo re-sim (pool), spline + PID (racer) | Behavior trees for complex roles |
| App shell | **Vite 8 + React 19.3 + TypeScript**, zustand 5, Motion 13, shadcn/21st, search-param routing (`?room=CODE`), custom InputManager (keyboard, Gamepad API, touch) | TanStack Router 1.170 if the page count grows |
| Static hosting | Cloudflare Pages / Vercel (static). The game server is separate | — |

---

## 1. Realtime multiplayer, rooms and netcode

### 1.1 Candidates (checked 2026-09-25)

| Option | Stars / last push / version | Model | Real-time physics fit | Rooms + links + matchmaking | Bots | Hosting / cost | Verdict |
|---|---|---|---|---|---|---|---|
| **Colyseus** | 7.3k / 2026-09-24 / `colyseus` 0.18.8, `@colyseus/sdk` 0.18.4 | Authoritative Node rooms. Delta-encoded binary `@colyseus/schema`. **0.18 (Aug 20 2026) adds `defineInput()`, `setFixedTimestep()`, `allowRewindState()` (lag comp), and client `Predict` (`reconciler`, `sim` for rollback-and-replay of an opaque engine world such as Rapier, `attachAll` lerp/damped interpolation, `spawns` for predicted projectiles), plus `room.clock` (`serverNow/renderNow/rtt/jitter`)** | Excellent. Demo: ColyStrike, a 30 Hz three.js FPS with hitscan rewind | `joinById` (share link), `create({private})`, `LobbyRoom` + `enableRealtimeListing()`, **queue matchmaking with `rank`/`teamId`/`mode`**, GeoIP region lock, reconnection | Rooms own the loop, so a bot is just a server-side input source | Self-host (Fly.io/Hetzner, ~$5–30/mo per region) or Colyseus Cloud (High Frequency plan recommended; ~$15/mo entry, per third-party review) | **Pick** |
| Cloudflare Durable Objects + PartyServer/partysocket | partykit monorepo 1.3k / 2026-08-03; `partyserver` 0.5.10, `partysocket` 1.3.0 (the `partykit` CLI is dormant at 0.0.115) | One single-threaded isolate per room, WebSocket Hibernation API, alarms | Weak for 60 Hz physics: no real game-loop primitive (you use `setInterval` or alarms), CPU limits, a room is placed near its **first** caller (`locationHint` only at creation). Cloudflare's own guidance points physics-heavy sims at Containers | Rooms-by-name are trivial (`/parties/pool/ROOMCODE`). Matchmaking is DIY | DIY | Cheap. WS messages billed 20:1, but a ticking room never hibernates, so duration is billed for the whole match | Good for pool (turn-based), presence and lobbies. Not for soccer or shooter |
| Convex | 12.6k / 2026-09-25 / `convex` 1.46 | Reactive DB + functions over WebSocket | No. Mutations are transactional at DB speed, not a 60 Hz loop | Great for lobbies, invites, tournaments (scheduled functions), leaderboards | Scheduled functions | Generous free tier | **Pick for the meta layer**, not physics |
| Playroom Kit | `playroomkit` 0.0.97 (2026-07); no public repo | Host-authoritative: one player's browser is the "server", plus a relay | Host migration and cheating risk; the host's latency adds to everyone's | Built-in lobby UI with room codes | Bots via host | MAU pricing (~$10/mo for 10k MAU) | Fast prototyping only. Host-auth is wrong for wagers |
| Rune | 424★ / 2026-08 / `rune-sdk` 6.0.8 | Server-authoritative predict-rollback, deterministic JS logic, inputs-only traffic | Good netcode model | Platform-owned (Rune app/site) | — | Platform | Can't self-embed in Chain.wtf. Borrow the *model* |
| Nakama (Heroic Labs) | 13.4k / 2026-09-22 / nakama-js 2.8 | Go server. Authoritative matches in Go/Lua/TS (goja) | TS runtime in goja is slow for physics. Go is fine but a second language | **Best built-ins**: leaderboards, tournaments, device-ID auth + link, friends, matchmaker | Yes | Self-host (Postgres/Cockroach) or Heroic Cloud (priced for enterprise) | Strong but heavy for this team. Convex + Colyseus covers the same ground in one language |
| Geckos.io | 1.5k / 2026-03 / 3.1.0 | WebRTC DataChannel (UDP-like) | Unreliable transport helps, but you still write all netcode | DIY | DIY | Needs open UDP port ranges, which rules out most PaaS | Skip. WebTransport is now Baseline (Safari 26.4, March 2026) for when datagrams matter |
| SpacetimeDB | 25.2k / 2026-09-25 / `spacetimedb` 2.10 | Database = server. Reducers in Rust/C#/TS, scheduled reducers as the tick (tutorials use 50 ms) | OK for .io-style games at 20 Hz. No prediction or rollback primitives | Subscriptions, not matchmaking | Scheduled reducers | Maincloud or self-host | Interesting for persistent worlds, not arena twitch games |
| Liveblocks | 4.7k / 2026-09-25 | CRDT/presence for collaborative docs | No | Rooms | No | SaaS | Wrong tool (fine for cursors) |
| Hathora | **Shut down 2026-05-05** (acquired by Fireworks AI). Successors: Edgegap, Gameye, GameFabric (Nitrado), Rivet (6.2k★, actor platform) | Container orchestration for dedicated servers | n/a | n/a | n/a | Overkill at hub scale | Edgegap only if you later need 600+ edge locations |

### 1.2 Netcode model per mini-game

| Game | Model | Tick / send rates | Details |
|---|---|---|---|
| **Platformer shooter** | Server-authoritative fixed-step sim + client prediction with rollback on your own avatar + interpolation of others + lag-compensated hits | Sim **60 Hz**, input sent every tick (unreliable channel when WebTransport lands, otherwise WS), state patch **30 Hz**, remote render delay ~100 ms (`Predict.get(room,{mode:"lerp",delay:100})`) | Chickenz already ships exactly this (60 Hz server sim, WASM sim shared by client and server, rollback reconciliation, "favor the victim"). Colyseus 0.18 now gives it off the shelf: `reconciler` for the local player, `spawns` for predicted projectiles, `rewind.lastSeenBy(shooter)` for hitscan. Use "favor the shooter" with `maxRewindMs ≈ 150–200` for hitscan and plain server resolution for slow projectiles |
| **Physics soccer** | Server-authoritative Rapier world at a fixed step + client **full-world rollback prediction** (`predict.sim` with `adopt` = `restoreSnapshot`/set body states, `step` = shared `applyInput` + `world.step`). This is the Rocket League approach: predict the ball as well, so touches feel instant | Physics **60 Hz** (120 Hz substep for ball-vs-player CCD if needed), patch 30 Hz, input every tick | Worlds are tiny (≤ 8 bodies + ball), so re-simulating 6–10 ticks per ack costs well under 1 ms in Rapier WASM. Smooth corrections visually over ~65–100 ms (`smooth_ms`). Needs `rapier3d-deterministic` on both sides so the replay matches the server |
| **8-ball pool** | **Turn-based deterministic lockstep of shot parameters**. The shooter sends `{aim, power, spin, tick}`; all peers and the server run the same deterministic analytic sim; the server's end-state hash is authoritative | No tick stream while balls roll. Only aim-preview messages (10–15 Hz, interpolated) and the shot | Zero-lag feel: the shooter's client plays its shot immediately and the server confirms the hash. Spectators get just the shot params. A replay is literally the list of shot params + rack seed. The break/rack jitter seed comes from VRF when a wager is involved |
| **Racer** (optional) | Server-auth + local car prediction + remote interpolation. Car-to-car contact is the hard case (use soft collision / ghosting in wager modes) | 60 Hz | Time trials = ghost replays (input logs) with no server at all |

Cross-cutting rules:
- **One shared deterministic sim package per game** (`packages/sim-soccer`, `sim-shooter`, `sim-pool`), imported by the Colyseus room, client prediction, bots, offline/practice mode and the replay verifier. This is also what makes "verifiable replays" free: `(version, seed, input log) → final state hash`.
- Inputs are tick-stamped; a missing input repeats the previous one (the Chickenz rule).
- Clock sync comes from `room.clock` (it rides input acks, so it only works if the room calls `defineInput()`).
- Regions: start with **3 (us-east `iad`, eu-central `fra`, ap-southeast `sin`)**. The client pings each region's `/health` on hub load (in parallel with asset preload) and joins the lowest. Friend rooms pin the region of the creator; the room code encodes the region (`E7K2Q-fra`).
- Transport: WebSocket today. WebTransport datagrams are Baseline since March 2026; keep the netcode transport-agnostic and add an unreliable input path later.

---

## 2. Physics

| Engine | Status | Determinism | Perf / size | Fit |
|---|---|---|---|---|
| **Rapier** (`@dimforge/rapier{2d,3d}-deterministic-compat` 0.21.0, published 2026-09-25) | JS bindings **moved into the `dimforge/rapier` monorepo (`bindings/typescript`)**; the old `rapier.js` repo was archived 2026-07-12. Very active (5.8k★) | Separate `-deterministic` builds enable `enhanced-determinism` (cross-platform, IEEE-754 strict, not SIMD). Since 0.15 the plain packages are **not** deterministic, so pick the `-deterministic` flavor explicitly | `takeSnapshot()`/`World.restoreSnapshot()` for rollback; `IntegrationParameters.dt` for a fixed step; `KinematicCharacterController` + `PidController`. The `-compat` builds embed the WASM as base64 (~+33% size, zero bundler config); unpacked 3D-det ≈ 15 MB across all files, real WASM payload ≈ 1.5–2 MB, so lazy-load per game | **Soccer, racer, props** |
| Jolt (`jolt-physics` 1.1.0) | Active (572★, 2026-08) | Bit-identical across platforms only in a `CROSS_PLATFORM_DETERMINISTIC` build (~8% cost); check which build the npm package ships or build your own | Fastest solver; heaviest package (46 MB unpacked across flavors); best vehicle constraint | Racer with proper wheels/suspension |
| cannon-es | Last push 2024-01 | No | Pure JS, slow | **Avoid (dormant)** |
| planck.js (Box2D port) | Active (5.3k★) | JS floats; OK if the sim avoids `Math.*` transcendentals, but no guarantee | Light | 2D alternative |
| box2d-wasm | Last push 2024-12 | — | — | Dormant |
| **Custom pool physics** | tailuge/billiards (253★, pushed 2026-09-25) is a validated TS reference: Han 2005 cushion model, Mathavan 2010, Alciatore throw, "lightweight and deterministic, batch rollouts practical"; pooltool (Python, event-based) as a second reference | Deterministic if you restrict the sim to `+ − × ÷ sqrt` (correctly rounded in IEEE-754, so identical across JS engines) and implement trig via lookup/polynomial or pass aim as a unit vector | Microseconds per shot, so bots can roll out thousands of shots in a Worker | **Pool** |
| **Custom fixed-point 2D** | Chickenz: i32 fixed-point AABB platformer, Mulberry32 PRNG | Bit-exact everywhere (integers) | Trivial cost | **Shooter**. Platformer "feel" (coyote time, jump buffering, wall slide) is easier to tune in a bespoke controller than in a rigid-body engine |

Determinism rules for all sims: fixed `dt`, no `Math.random` (seeded PRNG in the state), no `Math.sin/cos/exp/pow/atan2` inside the sim (V8, JSC and SpiderMonkey may differ in the last ULP), stable iteration order (arrays, not `Map`/`Set` over object keys), no `Date.now()`, and a version tag on every replay.

---

## 3. Rendering

| Option | Version / status | Notes | Verdict |
|---|---|---|---|
| **three.js** | r186 (0.186.1, 2026-09-24), 116k★ | `WebGPURenderer` via `import * as THREE from 'three/webgpu'`, `await renderer.init()`, **automatic WebGL2 fallback** (`forceWebGL: true` to test it). TSL node materials; `RenderPipeline` + `pass()`/`bloom()` nodes for post. WebGPU is Baseline in all major browsers (Safari 26) | **Pick** |
| **React Three Fiber** | 9.8.1 stable (React 19); v10 in alpha (WebGPU-first) | v9 `gl` prop accepts an **async factory** → `new THREE.WebGPURenderer(props); await renderer.init()` + `extend(THREE)`. `useFrame(cb, priority)` lets you take over the render loop to call a TSL `RenderPipeline` | **Pick** for scene composition and menu backdrops; keep hot sim state in refs/ECS, not React state |
| drei 10.7 | Active | Most helpers work under WebGPU; shader-material helpers (e.g. `MeshTransmissionMaterial`) are WebGL-only | Use selectively |
| pmndrs `postprocessing` / `@react-three/postprocessing` 3.1 | Active | **WebGLRenderer only.** Under WebGPU use three's TSL post nodes (bloom, FXAA/SMAA, DOF, AO, motion blur) | Use TSL post; only fall back to pmndrs if you pin `WebGLRenderer` |
| `@react-three/rapier` 2.2 | Last push 2025-11 | Convenient but hides the world you need for snapshots/rollback, and pins the non-deterministic build | **Don't use** for netcode'd games; drive Rapier directly from the sim package and sync meshes in `useFrame` |
| PixiJS v8 | 8.21.0, 48k★ | Fastest light 2D (WebGPU + WebGL), ~⅓ of Phaser's size | Only if the shooter goes pure 2D |
| Phaser 4 | 4.2.1 (released Apr 2026) | WebGL2 renderer rewrite, batteries-included (scenes, arcade physics, audio). Chickenz used Phaser | Not needed: the sim, input and audio are custom, and a second engine duplicates the shell |
| Babylon.js 9.28 | Active, 26k★ | Full engine, Havok physics, great WebGPU. Fights React/shadcn ergonomics | Credible alternative, but one ecosystem (three + R3F) is more productive with this UI stack |

**Why one renderer (three) for all games, the shooter included:** the "live game behind the menu" backdrop, shared post-FX/color grading, a shared asset pipeline and a single GPU context in the iframe. The 2.5D shooter uses an orthographic or low-FOV perspective camera, instanced sprite planes / low-poly meshes, and real lighting, which gives more "premium" depth than flat 2D.

### 3.1 Asset pipeline and near-instant load

- `gltf-transform` (1.98k★, active) → `meshopt` compression + `KTX2` textures (UASTC for normals/hero assets, ETC1S for the rest) + `dedup/prune/resample`. Load with `GLTFLoader.setMeshoptDecoder` + `KTX2Loader` (the Basis transcoder is lazy-loaded). Prefer Meshopt over Draco: faster decode and it also compresses animations.
- **Budget:** hub shell (React + shadcn + zustand + Motion) ≤ 150 KB gz critical JS; first meaningful frame < 1 s on 4G. The three chunk (~180 KB gz for `three/webgpu`) loads right after first paint behind an animated CSS/SVG splash; per-game chunks (`import('./games/pool')`) plus that game's WASM and GLBs are prefetched on hover/focus of its menu card.
- The menu backdrop is a **spectate or bot-vs-bot match** of the lightest game (pool: one shot's params replay deterministically, so it costs nothing to stream), rendered at reduced DPR (`min(devicePixelRatio, 1.5)`, adaptive via `pmndrs/detect-gpu`).
- Keep `renderer.compileAsync(scene, camera)` warm-ups out of match start: precompile during the lobby countdown.
- Serve assets with immutable hashed URLs + `Cache-Control: max-age=31536000`. The iframe shares the HTTP cache partition with Chain.wtf only for its own top-level site, so expect a cold cache on the first iframe visit.

---

## 4. Audio

| Option | Status | Notes | Verdict |
|---|---|---|---|
| **Direct Web Audio (custom ~300-line engine)** | Platform API | One `AudioContext`; buses (master → music / sfx / ui / voice) with `GainNode`; sprite playback from decoded `AudioBuffer` offsets; **adaptive music** = 3–5 stems started on the same `currentTime` with per-stem gain automation (intensity driven by the score gap / time left / boost use); sidechain-style ducking; pitch/variation randomisation from a seeded RNG | **Pick** |
| `THREE.PositionalAudio` / `AudioListener` | Built into three | Share the engine's context (`THREE.AudioContext.setContext(ctx)`), so the 3D ball hits, cushion thuds and engine sounds route into the SFX bus | Pick for 3D-spatial SFX |
| Howler.js 2.2.4 | npm untouched since 2023-09; repo pushed 2025-11 | Sprites and fallbacks are solid, but it duplicates what the custom engine does and has no bus graph | Acceptable fallback |
| Tone.js 15.1 | Active | Scheduling/synthesis powerhouse, but ~100 KB+ for features you won't use | Only for procedural/generative music |

Practical: ship Opus in WebM with an AAC `.m4a` fallback; build sprites with ffmpeg + a JSON offset map. **Unlock audio on the first pointer/key event**: sandboxed iframes still require a user gesture, and there is no `allow="autoplay"` guarantee. Respect `prefers-reduced-motion` / a mute toggle persisted per guest.

---

## 5. Bots (no LLMs)

Principle: **a bot is a seat that emits the same tick-stamped input struct a human does**, running server-side in the Colyseus room for online play and client-side for practice/offline/standalone demo. It uses a seeded RNG stored in the sim state, so replays with bots stay deterministic. Chickenz' `BotLobbyManager` pattern (fake waiting rooms filled by bots, bots auto-join a human room after ~5 s, adaptive difficulty 0.0–1.0, "mercy rounds") is worth copying.

| Game | Architecture | Difficulty knobs |
|---|---|---|
| Shooter | **Utility AI** (scores for: chase weapon pickup, engage, retreat to cover, stomp attempt, dodge projectile) over a **platform nav-graph** (nodes on ledges; edges = walk/jump/drop links precomputed from the tilemap by simulating jumps with the real sim) + aim model | Reaction delay (120–400 ms), aim noise σ, prediction of target velocity on/off, weapon preference, input-rate cap |
| Soccer | Role assignment each second (attacker / support / keeper by distance-to-ball ranking) + **steering** (arrive, pursue, separation) + **ball intercept prediction by forward-simulating the ball** with the shared Rapier sim (cheap; the world is tiny) + boost/jump utility (aerial if the predicted ball height at intercept > threshold) | Intercept horizon, touch accuracy noise, boost discipline, rotation awareness |
| Pool | **Shot enumeration** (ghost-ball geometry for each legal object ball × pocket, plus 1-rail banks and safeties) → for each candidate, **Monte-Carlo re-sim N=8–32 perturbed shots** with the real deterministic physics in a Web Worker → score = P(pot) × position value for the next shot (+ foul risk) → optional depth-2 lookahead (MCTS-lite) for "hard" | Candidate count, execution noise (angle/power/spin σ), lookahead depth, safety awareness |
| Racer | Racing-line spline + lookahead point + PID steering/throttle; overtaking via lateral offset; optional mild rubber-banding off in ranked | Line accuracy, braking-point error, lookahead distance |

Matchmaking uses bots to fill: the queue waits T seconds (e.g. 8 s ranked, 3 s casual), then backfills bots at a difficulty matched to hidden casual Elo. Label bots honestly in wager or ranked modes.

---

## 6. Identity, leaderboards, persistence and anti-cheat

### 6.1 Options

| Option | Guest-first | Link later | Works in sandboxed iframe? | Notes | Verdict |
|---|---|---|---|---|---|
| **Convex Auth** (`@convex-dev/auth` 0.0.95, `Anonymous` provider) | `signIn("anonymous")` creates a real `users` doc instantly | `callbacks.createOrUpdateUser` gives full control to merge the anon user into an OAuth/email account; trusted providers auto-link by verified email | **Yes.** JWT kept in `localStorage` (no third-party cookies needed) | Same backend as leaderboards/tournaments; Convex exposes a JWKS, so **Colyseus `onAuth` can verify the same JWT** | **Pick** |
| Better Auth (1.7.6, 30k★) anonymous plugin | `signIn.anonymous()` | `onLinkAccount({anonymousUser,newUser})` migrates data | Needs the `bearer` plugin (cookies are blocked in third-party iframes) | Needs your own server + DB | Good if you're not on Convex |
| Supabase anon sign-ins | Yes | `linkIdentity` / `updateUser` | Yes (token in localStorage) | Postgres + RLS; realtime less ergonomic for game meta | Alternative |
| Privy (`@privy-io/react-auth` 3.45) / Dynamic | Embedded wallets | Wallet or social link | **OAuth popups are blocked**: the sandbox lacks `allow-popups` | Standalone only | Later, standalone only |
| Nakama device auth | Yes | `linkCustom/Google/…` | Yes | Tied to Nakama | If Nakama is chosen |

### 6.2 Recommended identity flow

1. On first load: `signIn("anonymous")` → a Convex user with a generated handle ("Crimson Otter #4821") and avatar seed. The JWT is persisted in `localStorage` (wrapped in try/catch; fall back to in-memory).
2. The leaderboard works immediately (Convex reactive queries; rank via `@convex-dev/aggregate`).
3. **Link account**
   - *Standalone:* OAuth/email via Convex Auth → `createOrUpdateUser` merges stats and points.
   - *Inside the Chain iframe:* popups and top navigation are blocked. Show a **claim code / QR** ("Open chain-jam.xyz/claim and enter K7P-2QX"); the standalone session redeems it and merges.
   - *Wallet link:* `HostSnapshotV1.wallet.address` is readable, but `HostApiV1` has **no `signMessage`**, so the address is unverified client data. Treat it as a soft link for display. For a hard link, bind it to an on-chain fact: the address that opened a Chain session whose `gameData` contains `hash(userId)` (visible in `sessions.items[].raw.gameData`), verified server-side from chain logs.
4. **Storage partitioning:** inside chain.wtf the iframe's `localStorage` is partitioned per top-level site, so the iframe guest and the standalone guest are **different users** until linked. Design for that: claim-code merge, not an assumed shared identity. Safari ITP may also purge script-writable storage after 7 days without interaction, which is another reason to nudge linking after the first win.

### 6.3 Anti-cheat basics

- **Only the server writes results.** Colyseus rooms report match results to Convex through an HTTP action authenticated with a server secret; clients never call "submitScore".
- Replays: store `(simVersion, seed, inputLog)` for every ranked/wager match (compact, since inputs are bitmasks: ~2 bytes/tick/player). Re-simulate top-N leaderboard entries and disputed matches in a Convex action or worker and compare final-state hashes.
- Practice/solo high scores (e.g. pool trick-shot challenges) must be submitted as input logs and **re-simulated server-side** before they are accepted.
- Rate limits (`@convex-dev/rate-limiter`), per-device anon account caps, Glicko-2/Elo computed server-side, hidden casual MMR for bot backfill, AFK detection (Chickenz: < 5 input changes in 60 ticks).
- Server-side input validation: clamp analog ranges and enforce input rate ≤ tick rate. The rewind window is clamped by Colyseus (`maxRewindMs`) against clock spoofing.

---

## 7. Frontend app shell

| Concern | Pick | Why |
|---|---|---|
| Build | **Vite 8.3** + TS, static `dist/` with `base: './'` so it works under any path (Chain host, Pages, local simulator :3300) | Fast HMR; the WASM story is solved by Rapier `-compat` |
| UI | **React 19.3**, shadcn + 21st.dev components, Tailwind | Menus, lobbies, results, tournament brackets |
| State | **zustand 5** for app/meta state (screen FSM, party, settings); **sim state lives outside React** (plain objects / typed arrays in the sim package; R3F reads them in `useFrame`) | Avoids 60 Hz React re-renders |
| Routing | **No router.** A screen state machine in zustand + `URLSearchParams` (`?room=CODE&g=pool`, `?replay=id`, `?spectate=id`). Works on any static host with no rewrites | TanStack Router 1.170 if the shell grows |
| Motion | **Motion 13** (`motion/react`) for menus, layout transitions, result screens; GPU-cheap transforms only while a match renders | — |
| Input | Custom `InputManager`: keyboard (KeyboardEvent.code), **Gamepad API polled in rAF** (standard mapping, dead-zones, rumble via `vibrationActuator`), touch (custom virtual stick + buttons, multi-touch via Pointer Events), rebindable, output = same bitmask/analog struct the sim consumes | One path for humans, bots and replays |
| Casino bridge | `@chain/casino-sdk/guest` (Penpal) only when `window.parent !== window`; standalone demo mode otherwise (a jam requirement) | — |

**Sandboxed-iframe gotchas** (`allow-scripts allow-same-origin` only):
- No `allow-popups`: OAuth, "open in new tab" and wallet popups fail silently. Use the claim-code flow.
- No `allow-pointer-lock`: don't build mouse-look that requires pointer lock. The shooter uses cursor aiming or twin-stick.
- No `allowfullscreen` unless the host adds it: provide an in-page "theater" layout.
- `navigator.clipboard.writeText` needs the `clipboard-write` permissions policy on the iframe. Fall back to a selectable text field + "long-press to copy" for share links.
- Gamepad API: Chromium gates it behind the `gamepad` permissions policy (default `self`). **Verify in the Chain host** and show a hint if pads aren't visible.
- The share link must be the **standalone URL** (or Chain's own game URL if the host exposes one), because the iframe can't read or navigate the top-level URL.

---

## 8. Recommended architecture

```
                         ┌─────────────────────────────── Browser (standalone OR Chain.wtf iframe) ───────────────────────────────┐
                         │                                                                                                       │
                         │  React 19 shell (Vite static)  ── zustand (screens, party, settings)  ── shadcn/21st + Motion menus   │
                         │        │                                                                                              │
                         │        ├── InputManager (kbd / gamepad / touch) ──► InputStruct{tick,buttons,axes}                     │
                         │        │                                               │                                              │
                         │        │     ┌──────────── packages/sim-* (pure TS, deterministic, fixed-step) ───────────┐           │
                         │        │     │ sim-shooter (fixed-point) │ sim-soccer (rapier3d-det) │ sim-pool (analytic)│           │
                         │        │     └───────▲──────────────────────────▲────────────────────────▲────────────────┘           │
                         │        │             │ predict / rollback       │ bots (Worker)          │ replay / spectate          │
                         │        │     Colyseus SDK 0.18: Predict.reconciler / sim / attachAll / spawns, room.clock             │
                         │        │                                                                                              │
                         │  R3F 9 + three r186 WebGPURenderer (WebGL2 fallback) + TSL RenderPipeline post                         │
                         │  Web Audio engine (buses, stems, sprites) + THREE.PositionalAudio                                     │
                         │  casino-sdk guest bridge (Penpal) ──► host: openSession / submitAction / revealOutcome                │
                         └───────┬───────────────────────────────┬─────────────────────────────────────┬─────────────────────────┘
                                 │ WSS (binary schema deltas)    │ WSS (Convex sync)                    │ postMessage (iframe only)
                                 ▼                               ▼                                     ▼
        ┌──────────────── Colyseus 0.18 (Node, 3 regions: iad / fra / sin) ─────────┐   ┌──── Convex ────────────────────┐   ┌── Chain.wtf host ─────────┐
        │ queue room (rank, mode, party) ─► match rooms                              │   │ Convex Auth (Anonymous + OAuth)│   │ wallet, Smart Vault,       │
        │ PoolRoom (turn lockstep, hash check)                                       │   │ users / profiles / friends     │   │ signing, VRF sessions      │
        │ SoccerRoom (60 Hz rapier-det, defineInput, patch 30 Hz)                    │   │ leaderboards (aggregate)       │   └────────────┬──────────────┘
        │ ShooterRoom (60 Hz fixed-point, allowRewindState for lag comp)             │   │ tournaments (scheduled fns)    │                │
        │ Bot seats (utility AI / MC pool)  ·  onAuth: verify Convex JWT via JWKS    │──►│ match results + replays (HTTP  │                ▼
        │ LobbyRoom (realtime listing, spectate list)                                │   │ action, server secret)         │   Base L2: ICasinoGameV2 contract
        └────────────────────────────────────────────────────────────────────────────┘   │ replay re-sim verifier         │   (VRF-only outcomes, RTP 93–98%)
                                                                                         │ rate limiter, claim codes      │
                                                                                         └────────────────────────────────┘
Static frontend: Cloudflare Pages / Vercel (immutable hashed assets, KTX2 + Meshopt GLBs, per-game chunks, lazy WASM)
Offline / practice / standalone demo = same sim + bots client-side, no server
```

---

## 9. Risks and mitigations

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Jam contract rules vs skill PvP wagers.** `ICasinoGameV2` requires all outcomes from VRF, house-vs-player, RTP 93–98%. A skill match between two players can't be the thing that settles money | **Critical (design)** | Keep skill multiplayer for points/leaderboards/tournaments. Make the wagered layer a VRF-driven outcome embedded in the game (e.g. VRF picks a bonus multiplier, rack or challenge seed; the payout table stays VRF-only). Determinism and replays still matter for leaderboard integrity and for showing the VRF-seeded content verifiably. Validate with `casino-sdk/docs/CONTRACT_CONSTRAINTS.md` before building |
| 2 | Sandbox blocks popups, pointer lock, fullscreen, maybe clipboard/gamepad | High | Claim-code account linking, cursor/twin-stick aiming, in-page theater mode, copy fallback. Test inside the local simulator iframe (:3300) on day 1 |
| 3 | Storage partitioning: different guest per top-level site; Safari 7-day purge | Medium | Treat as separate guests; claim-code merge; prompt to link after the first meaningful progress |
| 4 | Soccer rollback cost / desync (Rapier WASM float determinism depends on using the `-deterministic` build on server **and** client, same version) | Medium | Pin exact versions in a shared package; CI test that runs the same input log on Node and in headless Chrome/WebKit and compares state hashes each tick |
| 5 | `@react-three/rapier` or pmndrs postprocessing silently pulls the non-deterministic or WebGL-only path | Medium | Don't use them in netcode'd games; use TSL post nodes; lint the imports |
| 6 | WebGPU driver issues on some Android/Intel GPUs | Medium | `detect-gpu` tiering + a `forceWebGL` fallback flag + DPR scaling; keep node materials simple |
| 7 | Regional latency for global friends (one room = one region) | Medium | Room pinned to the creator's region, with a ping shown in the lobby; matchmaking restricted to ≤ 120 ms RTT buckets; add regions on demand |
| 8 | Colyseus 0.18 netcode APIs are brand new (Aug 2026; "last release before 1.0") | Medium | They're additive; pin versions; fall back to the hand-rolled Chickenz-style reconciler if a bug blocks you |
| 9 | Durable Objects temptation (cheap, "serverless") for real-time rooms | Low–Med | Use DO/PartyServer only for turn-based pool/presence if you want edge placement; keep 60 Hz sims on Colyseus |
| 10 | Load-time bloat from three + Rapier + GLBs | Medium | Per-game code split, `-compat` WASM lazy-loaded, KTX2/Meshopt, splash-first rendering, a 150 KB gz shell budget enforced in CI (`vite build --report`) |
| 11 | Bot fairness perception (players think bots are humans) | Low | Label bots; hidden MMR; no bots in wager tiers unless disclosed |
| 12 | Hosting provider churn (Hathora and Multiplay shut down in 2026) | Low | Colyseus is a plain Docker/Node app, portable across Fly, Hetzner, Colyseus Cloud and Edgegap |

---

## 10. Sources

- Colyseus 0.18 announcement: https://colyseus.io/blog/colyseus-018-is-here/ · docs (netcode, matchmaker queue, lobby, geoip, cloud): https://docs.colyseus.io · ColyStrike demo: https://colystrike.vercel.app/ · Prediction playground: https://prediction-colyseus.vercel.app/
- Cloudflare Durable Objects (hibernation, pricing 20:1 WS messages, duration billing): https://developers.cloudflare.com/durable-objects/platform/pricing · DO multiplayer guidance: https://tech-insider.org/cloudflare-durable-objects-multiplayer-game-server-2026/
- Rapier determinism: https://rapier.rs/docs/user_guides/rust/determinism · JS snapshots: https://rapier.rs/docs/user_guides/javascript/serialization · repo move: https://github.com/dimforge/rapier.js (archived → dimforge/rapier/bindings/typescript)
- Jolt cross-platform determinism: https://github.com/jrouwe/JoltPhysics/blob/master/Docs/ReleaseNotes.md
- three.js WebGPURenderer manual: https://threejs.org/manual/#en/webgpurenderer · 2026 migration notes: https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- R3F Canvas async `gl`: https://r3f.docs.pmnd.rs/api/canvas · pmndrs postprocessing (WebGL-only): https://github.com/pmndrs/postprocessing
- Phaser vs PixiJS 2026: https://generalistprogrammer.com/comparisons/phaser-vs-pixijs
- WebTransport Baseline (Safari 26.4): https://webrtc.ventures/2026/04/webtransport-is-now-baseline-what-it-means-for-real-time-media/
- Playroom netcode/pricing: https://docs.joinplayroom.com/migration-guides/netcode · Rune predict-rollback: https://developers.rune.ai/docs/how-it-works/syncing-game-state
- Hathora shutdown: https://gameye.com/blog/game-server-shake-up-2026/ · https://edgegap.com/blog/how-to-migrate-from-hathora
- Convex Auth Anonymous + account linking: https://labs.convex.dev/auth/api_reference/providers/Anonymous · https://labs.convex.dev/auth/advanced
- Better Auth anonymous plugin: https://www.better-auth.com/docs/plugins/anonymous
- SpacetimeDB scheduled reducers: https://spacetimedb.com/docs/functions/reducers
- Storage partitioning: https://developer.chrome.com/docs/privacy-sandbox/storage-partitioning/ · https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/State_Partitioning
- Pool physics references: https://github.com/tailuge/billiards · https://github.com/ekiefl/pooltool
- Local: `references/chickenz/{MULTIPLAYER,SIM_SPEC,ARCHITECTURE}.md`, `casino-sdk/docs/{VISUAL_AND_UX,CHAIN_WTF_CASINO_GAMES}.md`, `casino-sdk/src/types.ts` (`HostApiV1` has no signMessage)
