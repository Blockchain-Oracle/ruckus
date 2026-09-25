# Chickenz.io: deep dive

**What it is:** 1st place, Stellar Hacks: ZK Gaming 2026. It is a 1v1 real-time 2D pixel-art platform shooter. A RISC Zero proof of the match result is settled on Stellar Soroban.
**Source:** `/Users/abu/dev/hackathon/chain-jam/references/chickenz`. Code is MIT. It is one squashed commit by Ash Francis, dated 2026-05-25.
**Links:** live at https://chickenz.io (US/EU/Asia servers, still up on 2026-09-25). BUIDL page: https://dorahacks.io/buidl/39887. Demo video: https://www.youtube.com/watch?v=z55wQKFHVMM

Line references below are relative to the repo root, unless the path is absolute.

> **Read this first. The docs and README are wrong in several places. The code is the only source of truth.**
> - "Pistol default": **wrong.** Players spawn **unarmed** (`weapon: WEAPON_NONE`, `services/prover/core/src/fp.rs:563`). The pistol is only a pickup, and an unarmed player cannot shoot at all.
> - "Aim: Mouse cursor": **wrong.** `InputManager.getPlayer1Input` always returns `aimY: 0`, and `aimX` comes from the last left/right key held (`apps/client/src/input/InputManager.ts:136-142`). All shots go **horizontally in the facing direction**. The sim supports 8 directions, but the client never sends them.
> - "Best of 3": true **only for ranked**. **Casual is best-of-5, first to 3** (`services/server/src/GameRoom.ts:30-34`). The live match history shows 3-2 and 3-1 scores.
> - "Freighter/Lobstr wallet": **outdated.** The code uses passkey smart accounts (`smart-account-kit`, `apps/client/src/stellar.ts:1`).
> - "Map rotation": the map pool is `[ARENA, TOWERS]` (`packages/sim/src/map.ts:100`). `BRIDGES` is defined but unused. **Ranked is locked to ARENA**, because the zkVM guest hardcodes `arena_map()` (`fp.rs:1660`, `fp.rs:1730`).

---

## 1. The game, exactly

### Core rules
These come from the Rust sim, `services/prover/core/src/fp.rs`. It is the single source of truth, compiled to WASM for client and server and to RISC-V for the prover.

| Rule | Value | Where |
|---|---|---|
| Players | 2 (hard-coded arrays of 2) | `fp.rs` State |
| Lives per round | 1, 100 HP | `fp.rs:57-62` |
| Round length | 1800 ticks = 30 s at 60 Hz | `fp.rs:63` |
| Sudden death | Starts at tick 1200 (20 s). A **damage zone** (not a wall) closes from both sides to the center over 300 ticks (5 s). Damage bursts every 10 ticks, scaling with progress (about 3 HP per burst at full close). Bullets pass through the zone. | `fp.rs:1512-1576` |
| Kill resolution | 30-tick (0.5 s) "death linger". The winner can still move and taunt, then `match_over`. | `fp.rs:1199-1227` |
| Time-up | More lives wins, then more HP. **Exact tie goes to player 0 (the host)**, so there are never draws. | `fp.rs:1579-1592` |
| Both die to the zone | Higher kill score wins, else player 0 | `fp.rs:1568-1574` |
| Match | Ranked: first to 2 of 3. Casual: first to 3 of 5. Safety cap `totalRounds+2` | `GameRoom.ts:30-34, 673-680` |

### Round flow (server-side, `GameRoom.ts`)
1. On `matched`, the server shuffles the map order (Fisher-Yates) and assigns characters: P1 keeps their "home" character, P2 gets home, else away, else random. The seed is `Date.now() >>> 0` (`:424`), and it stays the same across rounds in ranked (`:688`).
2. **Countdown:** 90 ticks with the sim frozen, while state is still broadcast (`:12, :508-512`). The client shows a DOM countdown "3, 2, 1, GO!" at 350 ms per step (`GameScene.ts:809-827`), then a "ROUND N" popup for 500 ms.
3. The round plays for up to 30 s.
4. On `match_over`, the server sends `round_end` immediately. The client shows the banner "Round 1 - NAME wins!\n1 - 0" (`GameScene.ts:910-916`). The server keeps simulating for 60 more ticks (1 s) so the winner can taunt (`GameRoom.ts:604-613`).
5. There is a 750 ms gap (`ROUND_TRANSITION_MS`), then `round_start`. The client plays the **diamond wipe transition** and swaps the map at its midpoint.
6. On match end, the client shows "NAME wins!" for 2.5 s, then the diamond wipe back to the lobby (`apps/client/src/net/ServerConnector.ts:128-149`). **There is no dedicated results screen.** Results live in the History tab.

### Weapons (`fp.rs:134-192`)
Players start empty-handed. There are 4 weapon pedestals. Their initial weapons are Pistol, Shotgun, Sniper and Rocket (`WEAPON_ROTATION[i%5]`, so **SMG never appears at round start**). A collected pedestal respawns after 300 ticks (5 s) with a PRNG-random weapon (`fp.rs:839-853`). A pickup replaces your current weapon and gives full ammo. When ammo hits 0, you drop the weapon and are unarmed again.

| Weapon | Dmg | Speed px/tick | Cooldown | Lifetime | Ammo | Notes |
|---|---|---|---|---|---|---|
| Pistol | 20 | 8 | 12 | 90 | 15 | 5 hits to kill |
| Shotgun | 12 x 5 pellets | 7 | 30 | 45 | 6 | 7 degree spread per side plus ±6/256 PRNG jitter and a slight upward bias (`fp.rs:926-974`) |
| Sniper | 80 | 16 | 60 | 120 | 3 | |
| Rocket | 50 direct | 7 | 45 | 120 | 4 | 40 px Manhattan splash, linear falloff from 25. It explodes on walls, platforms and expiry. No self-damage. |
| SMG | 10 | 9 | 5 | 60 | 40 | |

The projectile cap is 24 (`MAX_PROJECTILES`). Hits are point-in-AABB checks against the player box (`fp.rs:1015`). Projectiles are destroyed by any platform (with a 4 px buffer above the surface), the map walls, the ceiling and the floor (`fp.rs:990-1012`). There are no power-ups other than weapons.

### Stomp: the signature mechanic (`fp.rs:1277-1398`)
- **Trigger:** a player lands on the opponent's head. Their feet must be within 8 px below the target's head while falling.
- **What happens:** the rider locks on top. The victim is forced to "auto-run" in a PRNG direction, flipping every 20-60 ticks, and takes 1 HP every 2 ticks. The cap is 50 HP per stomp session; at the cap the rider is ejected.
- **Escape:** the victim mashes **alternating** L/R. Each press adds 17, decay is -1 per tick, and the threshold is 100, so about 3 left and 3 right presses. On escape, the rider is launched up and the victim gets 90 ticks of stomp immunity.
- **Presentation:** a UI label "SHAKE HIM OFF!" plus a yellow progress bar under the victim (`GameScene.ts:2185-2210`). On mobile, a "spin" gesture on the joystick produces the L/R mashing (`apps/client/src/input/TouchControls.ts:111-130`).

### Controls
From `InputManager.ts:15-21`. Two rebindable slots per action, stored in `localStorage` as `chickenz-bindings`.
- Move: A/D or ←/→.
- Jump: W or ↑. Jump is edge-triggered; double jump is available; wall slide and wall jump are supported.
- Shoot: Space or Mouse1. It is **held-auto-fire**: the sim fires whenever Shoot is down and the cooldown is 0.
- Taunt: S or ↓. It is cosmetic only. It plays the "hit" frames 2-6 as a "crouch" plus a per-character voice clip, and it is stripped from the transcript (`GameRoom.ts:535`).
- Mobile: a virtual joystick fills the left 55% of the screen (up = jump, down = taunt) plus a 90 px red shoot button (`apps/client/index.html:1672-1675`, `TouchControls.ts`). Jump is auto-pulsed while held (47 frames on, 3 off, at `TouchControls.ts:137`).

### Camera (`apps/client/src/scenes/CameraSystem.ts`)
- The canvas is always full-window. It is height-locked, so 540 world units always fill the screen height, and ultrawide screens see more horizontally (`apps/client/src/game.ts:9-25`). Phaser runs with `pixelArt: true` and `roundPixels`.
- **Dynamic "smash-style" 2-player framing:** the camera centers on the midpoint between the players. Zoom is 1.3x when they are under 250 px apart, easing to 1.0x at 500 px or more. It then zooms out further if needed to keep both players plus 80 px padding in view. Smoothing is `smoothLerp` with 0.05 for zoom and 0.15 for position (`:94-123`).
- **Kill-cam:** during death linger or the round transition, the camera zooms to 1.5x on the survivor (`:91-118`).
- Optional fixed "whole arena" mode is available (Settings > Dynamic Camera off).
- A separate HUD camera keeps the timer and round text unzoomed (`GameScene.ts:398-424`).
- Warmup and tutorial use 1.3x follow-cam on the local player.
- **Observed bug on the live site:** the camera is not clamped to the arena. At 1.3x near the left wall, half the screen is empty dark background.

### Maps (`packages/sim/src/map.ts`)
Every map is 960x540. All coordinates are on a 16 px grid.
- **ARENA:** ground plus 5 floating platforms, symmetric. Pedestals are at (192,384), (736,384), (464,272) and (464,480).
- **TOWERS:** ground plus 2 stacked side towers, a center bridge and a top platform.
- **BRIDGES:** defined but not in the pool.
- **TUTORIAL_MAP:** ARENA plus a high platform that needs a double jump (`apps/client/src/scenes/constants.ts:89`).
- All platforms are fully solid AABBs. **There are no one-way platforms**, so you bonk your head on the underside.
- Background: one of 7 Pixel Adventure 64x64 color tiles, chosen by hashing the seed and slowly scrolled in a seed-derived direction (`apps/client/src/scenes/MapBuilder.ts:26-40`).
- Platforms use 9-slice terrain tiles. The arena is framed by a dark stone border, and weapon pedestals are 3-tile terrain frames 17-19.

### Screen-by-screen flow (confirmed on the live site)
1. **First visit:** the lobby renders immediately, dimmed behind a modal: "LOOKS LIKE YOU'RE NEW HERE" with [PLAY TUTORIAL] or [SKIP]. The modal sits in a pixel frame built from terrain tiles (`apps/client/src/ui/TiledFrame.ts`).
2. **Tutorial:** 8 steps on a local WASM sim with no network (`apps/client/src/tutorial/Tutorial.ts:35-70`): move, jump, double jump to the high platform, pick up a weapon, shoot, get stomped and mash to escape, "Now take them out!", done. A yellow-bordered prompt box sits at the top center.
3. **Username prompt:** 1-7 characters, then "LET'S GO!". A guest name like `Fox4821` is auto-generated (`apps/client/src/ui/AnimalNameGenerator.ts`).
4. **Lobby** (`index.html:1839-1882`):
   - Header: logo, plus a region selector with flag, name and ping.
   - Action row: [CASUAL | RANKED] toggle (Ranked is locked with the tooltip "Connect a wallet to play ranked"), QUICK PLAY, CREATE PUBLIC, CREATE PRIVATE, a 5-letter CODE input with JOIN, and a "⋯" menu (Tournament, Tutorial).
   - Tabs: ROOMS, HISTORY, LEADERBOARD.
   - Room rows: name, mode badge, region badge, join code, player names, and a status pill (green "WAITING (1/2)" or orange "IN PROGRESS (2/2)") with a JOIN button.
   - Top bar: fullscreen, music toggle, settings gear, LOG IN / REGISTER (passkey).
5. **Waiting room ("warmup"):** you run around the ARENA alone on a local sim, with P2 banished to (-9999,-9999). The overlay reads "WAITING FOR OPPONENT..." with the big join code and [← LOBBY] [PLAY VS BOT] [COPY LINK]. In casual, a bot auto-joins after 5 s.
6. **Match:** diamond wipe, countdown, ROUND 1, play, round banner, and so on as described above.
   - HUD, top-left: `R1/3  0-0`.
   - HUD, top-right: timer `27s`.
   - HUD, top-center: "SUDDEN DEATH IN 3..2..1", then "SUDDEN DEATH" in red.
   - Weapon/ammo text, e.g. "SHOTGUN 4".
   - Per player: username above the head, a 24x4 HP bar (green, then orange below 50%, then red below 25%).
   - A "High ping >180ms" warning.
7. **End:** "NAME wins!" for 2.5 s, then the diamond wipe back to the lobby. The match appears in HISTORY with a proof-status badge (pending, proving, verified, settled) and a replay button.

Other modes:
- **Replay viewer:** Space pauses, ↑/↓ changes speed from 0.5x to 8x, Esc exits.
- **Tournaments:** brackets with spectating (`services/server/src/TournamentRoom.ts`, 872 lines).
- **Share links:** `?join=CODE` and `?replay=id&region=`.

---

## 2. Architecture

| Layer | Tech | Key files |
|---|---|---|
| Sim | Rust, fixed-point i32 (8 fractional bits, 256 = 1.0). Pure `step_mut(&mut State, &[Input;2], &Map)`. Fixed arrays, no heap. | `services/prover/core/src/fp.rs` (2195 lines: sim at 1-1610, streaming/proof helpers after that) |
| WASM binding | wasm-bindgen `WasmState`: `new(seed,mapJson)`, `new_warmup`, `step(6 args)`, `export_state()` (as JS object, fp to f64), `import_state` | `services/prover/wasm/src/lib.rs:270-416` |
| Legacy TS sim | Types and constants only. `step()` is never called at runtime (`AGENTS.md`). | `packages/sim/src/*` |
| Client | Phaser 3.87 (one `GameScene`, **no Phaser physics**), Vite 6, vanilla DOM/CSS for all UI (no React). | `apps/client/src/scenes/GameScene.ts` (2295 lines), `apps/client/index.html` (1943 lines, about 1570 of them CSS) |
| Server | Bun `Bun.serve` HTTP plus WebSocket, one process per region, SQLite (`bun:sqlite`). Also serves the built client from `services/server/public`. | `services/server/src/index.ts` (1550 lines), `GameRoom.ts`, `db.ts` |
| ZK | RISC Zero guest replays the 2 winning rounds, Groth16 wrap, either locally, via a "worker" PC polling `/api/worker/*`, or via the Boundless marketplace (on Base, paid in Base ETH). | `services/prover/guest/src/main.rs`, `services/prover/host/src/main.rs`, `services/server/src/prover.ts` |
| Chain | Soroban contract `start_match` / `settle_match`, Nethermind Groth16 verifier, Game Hub `start_game` / `end_game` | `contracts/chickenz/src/lib.rs` |

### End-to-end code path (entry to results)
1. **Entry point:** `apps/client/index.html`. An inline script (`:1888-1938`) hydrates the username, music icon, mode and wallet from `localStorage` before the module loads, to avoid a visible flash. Then it loads `/src/main.ts`.
2. **`apps/client/src/main.ts`:**
   - Creates `Phaser.Game(gameConfig)` with a single `GameScene` (`apps/client/src/game.ts:27-40`).
   - Gets or creates the username.
   - Defers BGM until the first click or keypress (`main.ts:269-283`).
   - Silently restores a passkey session (`:305-308`).
   - If the tutorial has not been seen, shows the prompt: tutorial, then username prompt (`:320-360`).
   - Wires the lobby, settings, wallet and match-action modules.
   - **Region bootstrap:** connects to the cached home region's WebSocket, measures pings to all regions, switches if a lower-ping region exists, then opens lobby streams to every region (`:607-636`).
3. **Lobby UI:** `apps/client/src/ui/LobbyPanel.ts`. Buttons call `NetworkManager.sendQuickplay/sendCreate/sendJoinRoom/sendJoinByCode`, passing the home and away characters (`apps/client/src/net/NetworkManager.ts:252-270`, `apps/client/src/session.ts:19`, `apps/client/src/ui/SettingsPanel.ts:402`).
4. **Server:** `services/server/src/index.ts` WebSocket `message` handler (`:990-1290`). It handles the quickplay, create and join logic, and fake-room consumption, then creates a `new GameRoom(...)`.
5. **One player in the room:** the server sends `waiting`. The client's `ServerConnector.onWaiting` (`apps/client/src/net/ServerConnector.ts:61-80`) rewrites the URL to `?join=CODE`, closes the lobby, and calls `GameScene.startWarmup` (a local solo sim).
6. **Second player joins:** `GameRoom.addPlayer` calls `startMatch` (`services/server/src/GameRoom.ts:360-446`) and sends `matched` to both. The client's `onMatched` (`ServerConnector.ts:82-115`) calls `GameScene.startOnlineMatch`. That runs the diamond wipe, then `initRound` at the midpoint (creating a new `PredictionManager` and snapping the camera), then the countdown, then `playing=true`. It also hooks `scene.onLocalInput` to `NetworkManager.sendInput`.
7. **Match loop:**
   - **Client, per frame** (`GameScene.ts:1291-1603`): apply the latest buffered server state, then run prediction ticks at a fixed 60 Hz accumulator. Each tick calls `onLocalInput`, which becomes `sendInput`. `sendInput` only sends if buttons or aim changed; the throttle is reset on each match and round (`NetworkManager.ts:273-294`). Then `render()`: camera, arena zone, pickups, players, projectiles, explosions, HUD.
   - **Server:** `GameRoom.gameLoop` then `tick` (`GameRoom.ts:493-625`): 90-tick countdown freeze, queued tick-tagged inputs, bot inputs, transcript push, `wasmState.step`, full-state broadcast.
   - **RTT:** the client sends a `ping` every 2 s (`NetworkManager.ts:213-217`).
8. **Round end:** the server sends `round_end`. The client's `handleRoundEnd` shows the banner. The server sends `round_start` 60 ticks plus 750 ms later; the client's `startNewRound` runs the wipe, a new round and the countdown.
9. **Match end:** `GameRoom.endMatch` sends `ended` (`GameRoom.ts:703-750`). Then `returnToLobby` on the server (`index.ts:201-339`) updates ELO or casual ELO, writes the match record and transcript, pins to IPFS, and triggers proving for ranked. On the client, `onEnded` (`ServerConnector.ts:128-149`) shows "NAME wins!" for 2.5 s, runs the wipe, reconnects to the home region if needed, and reopens the lobby.

### Netcode
**Server authority** (`GameRoom.ts:486-625`):
- The server-authoritative sim runs at **60 Hz**. It uses `setInterval(1000/60)` with self-correcting catch-up (at most 4 ticks per interval).
- The client sends `{type:"input", tick, buttons, aimX, aimY}` **on change**. Tick-tagged future inputs are queued so edge detection lines up with the client's prediction (`:224-241`). A missing input reuses the last one.
- The server broadcasts the **entire state as JSON every tick**: players, projectiles, pickups, arena bounds, RNG state (`:627-668`). There is no delta compression and no binary encoding.

**Client prediction and rollback** (`apps/client/src/net/PredictionManager.ts`):
- The client runs its own WASM sim ahead of the server. The lead adapts to RTT: `ceil(rtt/2/16.67)+1`, clamped to 2-8 ticks (`GameScene.ts:1567-1586`). It will not run more than 10 ticks past the last server tick.
- When a server state arrives, the client does `import_state`, then replays its buffered local inputs. The remote player's input is assumed to be its last buttons, with **aim zeroed**.
- If the client is more than 16 ticks behind, it hard-snaps instead of replaying.
- Only the newest server state is applied, once per frame (`GameScene.ts:1178-1188`).

**Rendering smoothing:**
- **Local player:** exponential blend at 0.3, capped at 15 px per frame. It snaps to Y when grounded and teleports if the error exceeds 200 px (`GameScene.ts:1756-1782`).
- **Remote player:** dead reckoning with gravity, a 0.4 pull toward the server position, and a snap on landing (`:1788-1819`).
- Health, lives and deaths are always taken from the server, even for the local player (`:1733-1745`).

**Hits:** "favor the victim". Hits resolve on the server's current state and there is no lag compensation or rewind (`MULTIPLAYER.md`).

**Transport:** plain WebSocket, `/ws`. There is no WebRTC and no lockstep. The client also opens parallel lobby sockets to all 3 regions and merges their room lists (`apps/client/src/net/RegionManager.ts`).

**Performance tricks:**
- 300 silent JIT-warmup sim ticks when the scene is created (`GameScene.ts:275-282`).
- BGM (about 13.5 MB) is lazy-loaded.

### Rooms and matchmaking (`services/server/src/index.ts`)
- **Room types:** public or private rooms, with 5-letter join codes that exclude I and O.
- **Quick Play** joins the first waiting public room of the same mode. Failing that, in casual it **instantly consumes a fake bot room**. Otherwise it creates a room, and in casual a bot is added after 5 s (`:1218-1286`).
- **Fake lobby:** `BotLobbyManager` keeps **3-5 fake "waiting" rooms** that churn every 45-120 s. Joining one silently creates a real room with a bot (`services/server/src/BotLobbyManager.ts`).
- **Exhibitions:** a bot-vs-bot match is spawned every 2-5 minutes so the room list and history look alive (`index.ts:1494-1547`).
- **Bot disclosure:** bots are **deliberately disguised as humans**. There is no [BOT] tag, and they use human-looking names (`AGENTS.md` invariant 9).

### What the ZK proof proves
- **Journal (76 bytes):** `winner i32`, `round_wins [u32;2]`, `transcript_hash` (SHA-256 of the two per-round SHA-256 hashes), and `seed_commit` (SHA-256 of the u32 seed).
- **Verification:** the guest replays **only the 2 rounds the match winner won** and asserts that the same player won both (`fp.rs:1772-1823`). The contract checks the Groth16 seal against the pinned `image_id`, checks that `seed_commit` equals the value stored at `start_match`, and then calls `GameHub.end_game(player1_won)` (`contracts/chickenz/src/lib.rs:180-318`).
- **What it guarantees:** "these input bytes, run through this exact sim code with this seed, produce this winner."
- **What it does NOT prove:**
  - The inputs are **not signed by the players**. The server records them, so a malicious server can fabricate a transcript.
  - A lost round in a 2-1 match is never proven.
  - The seed is `Date.now()`, which is predictable and server-chosen.
  - Settlement is admin-gated (the README's "Known Limitations").
- **In short:** it is verifiable *computation*, not trustless *input*.
- **Ranked only:** proofs run only for ranked, human-vs-human matches that finished naturally (`index.ts:256-285`). Casual and bot matches are never proven.

### Persistence
SQLite tables are `matches`, `player_stats` (ELO, default 1000), `casual_elo` (hidden, default 800, K=24; it drives bot difficulty) and transcripts (`services/server/src/db.ts:57-95`, `DATABASE.md`). Full transcripts are also pinned to IPFS via Pinata. There are daily DB backups. Client preferences live in `localStorage` (`chickenz-*` keys).

---

## 3. Visual design

**Art style:** 16-bit-ish pixel platformer from the Pixel Frog "Pixel Adventure" look. Colorful 32x32 characters, pastel diagonal-stripe tiled backgrounds, grass/dirt terrain and a stone-brick arena frame. The UI is a dark "retro terminal" with square corners everywhere (`* { border-radius: 0 !important }`) and faint CRT scanlines on the body background (`index.html:28-37`). The screenshot of the live tutorial confirms the pink striped background, grass ground, stone border, Ninja Frog with a red headband, and guns bobbing above yellow pedestals.

### Asset inventory
All files are under `apps/client/public/`.

| Asset | Files | Size | Likely source / license |
|---|---|---|---|
| Characters | `sprites/characters/{ninja-frog,mask-dude,pink-man,virtual-guy}-{idle(11f),run(12f),jump(1),double-jump(6),fall(1),hit(7),wall-jump(5)}.png` (28 files) | 32x32 frames in horizontal strips, 20 fps (`apps/client/src/scenes/constants.ts:29-39`) | **Pixel Frog, "Pixel Adventure 1"** (itch.io). As far as I know it is released as CC0/free for commercial use, **but check the itch page before shipping**. The repo has **no credits file**. |
| Terrain | `sprites/terrain.png` | 352x176, 16x16 tiles, 22x11 | Pixel Adventure 1 terrain sheet |
| Backgrounds | `sprites/bg-{blue,brown,gray,green,pink,purple,yellow}.png` | 64x64 each | Pixel Adventure 1 |
| FX | `sprites/dust.png` (16x16), `sprites/collected.png` (6x32x32 "collected" pop), `sprites/transition.png` (44x44, unused; the transition is CSS) | tiny | Pixel Adventure 1 |
| Guns | `sprites/gun-{pistol,smg}.png` 32x32, `gun-{shotgun,sniper,rocket}.png` 64x32, rendered at 0.5x scale | tiny | **Unknown provenance.** Not Pixel Adventure. There is an in-repo `public/gun-editor.html` for tuning offsets only. |
| Logo | `sprites/logo.png` 340x96, `favicon.png` 256x256 | chrome 3D block text "CHICKENZ" | Looks AI-generated or custom. It is the project's brand, so **do not reuse it**. |
| WASM | `chickenz_wasm_bg.wasm` | | built |

**Licensing bottom line:**
- The MIT license covers the code only.
- The characters, terrain and backgrounds are a third-party pack (Pixel Adventure). Get them from the original source and add attribution yourself; don't copy them out of this repo.
- The gun sprites have no traceable source. **Do not reuse them.**
- The music is copyrighted (see section 4).

### Palette
From the CSS and `constants.ts`:
- **Backgrounds:** page `#0a0a14`, cards `#0d0d1a`, panels and rows `#1a1a2e`, transition diamonds `#111122`, world outside the arena `#211f30`.
- **Text:** `#ccc` body, `#888` muted, `#555` disabled.
- **Accent yellow `#ffee58`:** titles, active tab, focus ring, announce text with a `#c9a800` drop shadow.
- **Primary green:** `#1a6b3c` fill with a `#2a9d5c` border.
- **Warn brown:** `#6b3a1a` / `#9d5c2a`.
- **Status:** orange `#ffa726` (ranked, in-progress, section headers), green `#66bb6a` (waiting, verified), red `#ef5350` / `#ff4444` (errors, sudden death), blue `#4fc3f7` (settled).
- **Players:** blue `#4fc3f7`, red `#ef5350`.
- **Sudden death zone:** `#ff0000` at 50% alpha.

### Typography
**Silkscreen** (Google Fonts, 400 and 700) everywhere, uppercase with 1-2 px letter-spacing. Phaser text uses `setResolution(DPR)` so it stays crisp. The code references "Press Start 2P" for sudden death but never loads it, so it falls back to Courier.

### UI components
- **Buttons:** square, 2 px border, **2 px hard drop shadow `#111`**. Hover moves them 1 px; active moves them 2 px and removes the shadow, giving a physical press (`index.html:118-144`).
- **Inputs:** inset black shadow.
- **Mode toggle:** a segmented pill.
- **Status pills:** bordered, colored text.
- **Tiled pixel frames:** modal frames built from terrain-sheet tiles via CSS background-position (`apps/client/src/ui/TiledFrame.ts`).
- **Room list:** rows with badges.
- **Center announce overlay:** 32 px yellow with a stepped shadow.

### Animation and juice
Most of this lives in `GameScene.ts`.

**What it has:**
- **Diamond-wipe transition:** a 5x3 grid of 45-degree rotated squares that scale 0 to 1 with a 60 ms stagger per column (180 ms each), hold 250 ms, then shrink out. It wraps every scene change: lobby to match, round to round, match to lobby (`:835-907`, CSS `index.html:895-937`). This is the single most "premium"-feeling piece.
- **Countdown and announcements:** DOM overlays.
- **Dust particles:** a sideways puff on jump and landing, and an arc under the player on double jump (`:2108-2138`).
- **Pickups:** bob (`sin(tick*.08)*2`), alpha shimmer, floating "glow" dust, and the Pixel Adventure "collected" pop animation when taken (`:1631-1688`).
- **Gun sprite:** anchored per weapon at hand position. Its bob is synced to the character's animation frame, and it flips to point away from the wall while wall-sliding (`:2070-2104`).
- **Comedic death ragdoll:** the body inherits 1.5x momentum, pops up, spins until flat (±90 degrees), bounces up to 3 times with 0.45 restitution, then stays as a 50%-alpha corpse (`:1861-1946`).
- **Taunt:** plays the crouch animation plus a character voice (croak, "ooga", wub, pop). It is spammable, and bots taunt after 50% of the rounds they win.
- **Invincibility:** 6-tick blink.
- **Rockets:** the explosion is two expanding orange/yellow circles over 15 frames (`apps/client/src/scenes/ProjectileRenderer.ts:92-108`).
- **Bullets:** white rectangles with black outlines, sized per weapon (3x2 up to 6x4), snapped to the muzzle on their first frame (`ProjectileRenderer.ts:38-89`).
- **Kill-cam:** 1.5x zoom on the survivor.

**What it does NOT have:**
- screen shake
- hit-stop
- hit flash or white-tint on damage
- damage numbers
- muzzle flash
- shell casings
- bullet trails
- knockback
- recoil

(I grepped for them; none exist.) This is a big gap to fill.

---

## 4. Audio

**Libraries:** Phaser's WebAudio sound manager for file audio (`apps/client/src/scenes/AudioManager.ts`). A hand-rolled **procedural Web Audio synth** handles all gameplay SFX (`apps/client/src/audio/sfx.ts`).
- **Gameplay SFX are synthesized, not files:**
  - `shoot`: a square wave sweeping 440 to 880 Hz over 50 ms.
  - `shoot-smg`: a prerendered 20 ms square-wave buffer.
  - `hit`: a noise burst plus a 200 Hz thud.
  - `death`: a sawtooth sweeping 600 to 100 Hz.
  - `pickup`: a 4-note arpeggio.
  - `jump`, `explosion` (80 to 30 Hz sine plus noise), `match-start` (C-E-G) and `match-end`.
- **Triggering:** these are fired by *diffing* consecutive states: new projectile ids, HP drops, alive-flag flips, weapon changes, jumpsLeft decreasing (`AudioManager.ts:186-220`).
- **File SFX:** only the 4 taunt clips (`audio/frog-croak.mp3`, `ooga.mp3`, `wub.mp3`, `pop.mp3`, about 0.3-0.45 s each). Their metadata includes a Clipchamp comment, so their origin is unknown. **Do not reuse.**
- **Music:** `audio/bgm-1..5.mp3`, 160-238 s each, about 13.5 MB total. They are shuffled with no immediate repeat and cross-faded over 1 s. Music is **OFF by default** and lazily loaded, with a 10% default volume. It fades out when the tab loses focus.
  - **`bgm-3.mp3` has the ID3 title "NCS223 | Ephixa & Jim Yosef - Everlasting".** That is a NoCopyrightSounds track, which requires attribution and is restricted for commercial or gambling use. The others are probably also NCS. **None of the music is reusable.**
- **Volumes:** SFX 80%, music 10%, stored in `localStorage`.

---

## 5. Physics and movement feel

Values are per tick at 60 Hz (`fp.rs:44-85`, same as `packages/sim/src/constants.ts`).

| Const | Value |
|---|---|
| Gravity | 0.5 px/tick² |
| Run speed | 4.0 px/tick (240 px/s) |
| Acceleration / deceleration | 0.8 / 0.6 per tick (full speed in 5 ticks, stop in about 7): snappy, a little slidey |
| Jump velocity | -10.5, giving an apex of about 110 px (about 3.4 player heights) in 21 ticks |
| Max fall | 12 |
| Double jump | 2 jumps total. Mid-air jump resets vy to -10.5. |
| Wall slide | Max fall 2.0 while holding into a wall (map edges, or platform sides within a 2 px band) |
| Wall jump | vx 7.0 away, vy -10.0. Wall contact refunds 1 jump if you have 0. |
| Hitbox | 24x32; the sprite is 32x32 |
| Collision | Swept? **No.** It moves by full velocity, then resolves overlap per platform on the minimum-penetration axis (`fp.rs:689-744`). With 12 px/tick max fall against 16 px platforms, tunneling is avoided. |

**Missing feel features:** coyote time, jump buffering, variable jump height (release early for a short hop), one-way platforms, ground friction variation, and knockback on hit. The movement feels tight because of fast acceleration and the double jump plus wall jump, but it is "floaty-arcade" rather than precise.

---

## 6. Bots (`services/server/src/BotAI.ts`, 806 lines)

- **Where they run:** server-side, choosing inputs per tick. Their inputs go into the transcript, so replays stay deterministic even though they use `Math.random`.
- **Difficulty:** a continuous 0-1 scale that interpolates between easy, medium and hard anchors (`:152-231`). The anchors set dodgeChance (0.12 / 0.5 / 0.8), reaction window, jump-dodge, shootChance, decisionInterval (13 / 8 / 6 ticks), stompChance and pickup detour.
- **Behaviour priority:**
  1. When the opponent is dead: taunt spam.
  2. When stomped: mash L/R.
  3. Dodge projectiles, using a perpendicular-distance check under 70 px.
  4. Platform navigation state machine (approach, jump, land) with stuck detection.
  5. Chase, pick up weapons and shoot.
- **Rubber-banding** (`GameRoom.ts:203-212, 470-491`):
  - A "mercy round" in one of the first two rounds lowers difficulty by 0.2-0.35.
  - If the bot is leading, it drops 0.15; if it is trailing, it rises 0.05.
  - AFK detection turns mercy off.
- **ELO-driven difficulty:** `difficulty = clamp((casualElo-500)/1000,0,1)`.

---

## 7. Code quality: reuse vs rewrite

**Quality overall:** good for a hackathon.
- Strict TypeScript and ESLint, with about 440 tests claimed.
- A self-audit document exists (`AUDIT_REPORT.md`: 8 critical and 22 high findings, most fixed).
- `GameScene.ts` is a 2.3k-line god-class, and `index.html` holds about 1.5k lines of inline CSS.

**Reuse (patterns and code, with MIT attribution):**
- **Deterministic fixed-point sim pattern:** `step_mut` with fixed arrays, i32 FP, Mulberry32 `prng_int_range` and a pure `(state, inputs, map)` signature (`fp.rs:429-439, 1164-1604`). It is directly reusable as a design, and the numbers are a good starting tune.
- **WASM-shared-sim client prediction and rollback:** `apps/client/src/net/PredictionManager.ts`, plus the input tick-queue in `GameRoom.handleInput`.
- **Render smoothing:** local blend with a cap, remote dead reckoning (`GameScene.ts:1733-1822`).
- **Camera framing plus kill-zoom:** `apps/client/src/scenes/CameraSystem.ts`, about 140 lines. Lift it nearly as-is.
- **Diamond wipe:** CSS plus `playTransition` (`GameScene.ts:835-907`).
- **Ragdoll death:** `GameScene.ts:1861-1946`, `RagdollSystem.ts`.
- **Gun anchoring with frame-synced bob:** `constants.ts:53-68`, `GameScene.ts:2070-2104`.
- **Procedural SFX module:** `sfx.ts`. It is license-free because it is generated.
- **Bot AI skeleton and difficulty interpolation.**
- **Button CSS:** the pixel press-shadow.

**Rewrite:**
- **Networking:** 60 Hz full-JSON state. Use binary or delta encoding, and consider 20-30 Hz snapshots plus prediction.
- **Stellar, passkey and Boundless integration.** It is irrelevant on Base.
- **The fake-lobby and disguised-bot system.** It is unacceptable in a real-money context; see section 8.
- **Asset set:** re-source or replace the guns, logo, all music and the taunt clips.
- **UI layer:** split the DOM overlays into components.
- **HUD:** it is sparse (text only). It needs real portraits, HP bars and a round-pips HUD.

---

## 8. Weaknesses and what could be better

**Trust and integrity:**
- The proof does not bind player intent. There are no input signatures, and the server picks a guessable `Date.now()` seed.
- Only the 2 winning rounds are proven.
- Settlement is admin-only.
- **The house tie-break favors P0 (the room creator)** on exact HP ties at time-up and on zone double-kills. In a wager context this is an edge that must be removed or made symmetric.

**Deception:**
- Fake waiting rooms, disguised bots and bot-vs-bot "exhibitions" fill history. The live `/api/matches` is **all bot-vs-bot** (e.g. "Gh0st vs Krypt0"). The live leaderboard is **polluted with `elo-w-test-*` test accounts** (200-0).
- Rubber-banding bots secretly throw rounds.
- Fine for a free toy. **Illegal or unethical with wagers.**

**Netcode:**
- Full-state JSON at 60 Hz per client is several KB/s up to tens of KB/s, with GC pressure.
- No lag compensation: hits register late for the attacker.
- No reconnection window. A disconnect is an instant forfeit (`GameRoom.ts:265-280`; the audit's H10 is "won't fix").
- `setInterval` timing on Bun.

**Game design:**
- **Horizontal-only shooting.** Vertical play is dominated by stomps and positioning, so it feels limited.
- No one-way platforms.
- Players start unarmed and race to pedestals, so the opening is a coin-flip race.
- SMG never spawns initially.
- Tiny maps (2 in rotation).
- Only 4 cosmetic characters.

**Juice gaps:** no screen shake, hit-stop, muzzle flash, damage flash, knockback or trails. Explosions are flat circles.

**UX:**
- No results screen (just a 2.5 s banner).
- Camera not clamped, so empty space shows at the edges (observed live).
- Sudden-death font falls back to Courier.
- Music is off by default, so the first impression is silent apart from synth blips.
- There is no "rematch" button.

**Ops:** single-process in-memory rooms; SQLite per region; the README says the leaderboard can be farmed and the AFK threshold is gameable.

---

## 9. Mapping Chickenz to a Chain Jam casino wager round (wager, then VRF outcome, then payout)

**The core tension:** Chickenz is a pure **skill** game. The player's inputs decide the winner. A casino game on the Chain SDK is supposed to have its outcome **decided by VRF**, with a fixed, provable RTP and a house edge. You cannot have both "the better player wins" and "a fixed RTP settled by VRF" for the same outcome. The options below differ in where the randomness sits.

1. **PvP skill wager with a rake (Chickenz as-is, money on it).**
   - How it works: both players stake, the winner takes the pot minus a fee. VRF is used only for the seed: map, weapon spawns, shotgun jitter, stomp auto-run. It replaces the server's `Date.now()` seed, which fixes a real Chickenz weakness.
   - Pros: most faithful to the design; the "house" earns a rake, not an RTP.
   - Cons: it is not a casino game in the VRF-outcome sense. Result integrity depends on a trusted server, or on replay proofs with signed inputs. It raises skill-gaming legal questions, and it needs real opponents (no bot backfill with money).
   - **Likely mismatched with a jam that asks for VRF-settled casino games.**

2. **VRF decides the outcome; the arena is a cinematic.**
   - How it works: the player wagers and picks a fighter or bet (win, round score, "stomp kill", and so on). VRF fixes the result against a published paytable. The client then **renders a deterministic bot-vs-bot match scripted to reach that result**. For example, search seeds offline or at runtime with the deterministic sim until the replay matches the VRF-drawn outcome, or steer bot difficulty or inputs from the VRF randomness.
   - Pros: exact RTP, full Chickenz look and feel, cheap, and the deterministic sim makes it replayable and auditable.
   - Cons: the player **watches** rather than plays. It is honest only if clearly presented as a simulation; do not present a scripted fight as a skill contest.

3. **Hybrid: skill contest with VRF multipliers or modifiers.**
   - How it works: the player plays a short solo round against a bot, or a timed survival run. The wager's payout multiplier comes from VRF (a crate or multiplier reveal before or after the round, or random weapon drops that each carry a VRF prize), and the skill part only unlocks or qualifies. The RTP is computed assuming perfect play, so the skill effect is capped.
   - Pros: interactive, keeps the Chickenz feel.
   - Cons: RTP math is harder. Skill still shifts the effective RTP unless the skill part only gates small, capped amounts. That needs careful design and a regulator-style explanation.

4. **"Prediction or spectate" betting on arena matches.**
   - How it works: run continuous bot-vs-bot arena fights, the way Chickenz already runs exhibitions. Players bet on the outcome at odds. The fight is driven by VRF-seeded bots, so the outcome is random but verifiable by replaying the seed through the deterministic sim.
   - Pros: this is the closest to a "real" casino product with the arena spectacle (like virtual sports). The house edge sits in the odds, and bot difficulty or skill parameters define the true probabilities (compute them via Monte Carlo on the sim).
   - Cons: odds must be computed from simulation, and it needs audit tooling.

5. **Solo "arena run" against the house.**
   - How it works: the player fights VRF-parameterized waves or bots. VRF determines wave composition, drops and multipliers; payout rises with rounds survived.
   - Cons: skill still matters, so RTP depends on the player population, like arcade redemption. Acceptable only with conservative caps.

**Recommendation for fidelity plus honesty:**
- Keep the whole Chickenz presentation layer: camera, diamond wipe, ragdoll, stomp, weapons, round banners.
- Pick **option 4 (bet on VRF-seeded arena fights)** or **option 2 (VRF-decided, rendered fight)** as the casino core. Both keep the result fully VRF-decided and the RTP exact, and the deterministic fixed-point sim becomes the "provably fair replay" (VRF seed in, identical fight out).
- If real PvP play is required, offer it as a separate rake-based mode (option 1) and don't call it VRF-settled.
- **Never reuse the disguised-bot and fake-room tricks where money is involved.**
