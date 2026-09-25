# KaspaKinesis (ꓘK) / DAG Dasher: deep dive

> Source: https://github.com/peavey2787/KaspaKinesis. Local clone on branch `voice` at `references/KaspaKinesis`; it is a shallow clone with one commit, `408627f`. The default branch is `main`. `voice` is **32 commits ahead of `main` and 0 behind**, last pushed 2026-02-27.
> Live: https://kaspakinesis.vercel.app (Next.js marketing and demo hub). The game is served at https://kaspakinesis.vercel.app/kktp/game, which returned HTTP 200 when checked.
> Author: Peavey2787 (solo). License: MIT (root `LICENSE`, "Copyright (c) 2026 Peavey2787").
> Paths below are relative to `references/KaspaKinesis/web/` unless noted. Line numbers refer to the `voice` checkout.

---

## TL;DR

- **It is not an adventure or racing game.** KaspaKinesis is a **serverless multiplayer SDK/engine** for the Kaspa BlockDAG. The playable demo that ships with it is **DAG Dasher**, a **3-lane endless-runner** in the style of Subway Surfers or Temple Run. It is branded as a race, but the race clock is the blockchain.
  - The finish line is fixed at **+1,800 Kaspa DAA score** (about 3 minutes at 10 blocks/s). Your "progress" is **block height elapsed**, not how fast you ran.
  - Both players therefore "finish" at the same moment. In practice the winner is decided by **who still has coins**, then by **coin count** as a tie-break.
- **Core loop:** dodge color-coded barriers (jump, duck or change lane), grab coins, and gamble on mystery pickups. The pickups are 4 buffs and 3 debuffs. A hit costs 10 coins and slows you. **If a hit leaves you with 0 coins, you are out.**
- **Multiplayer is 1v1 "parallel solo runs".** The opponent is **never rendered in 3D**; they appear only as a HUD standings bar.
  - Each client generates its own course, so the courses almost certainly differ.
  - Each client starts its own 1,800-DAA window after its own countdown, so the windows are offset in time.
  - All traffic (lobby, chat, moves, heartbeats and now voice) travels as **Kaspa transaction payloads**. There is no game server, no WebSocket relay and no WebRTC.
  - See section 11 for how to make it properly multiplayer.
- **Randomness** comes from a "VRF" that is really a **public-beacon hash mix**. `SHA-256 "recursive folding"` combines the seed, the NIST quantum beacon pulse, the latest 12 Kaspa block hashes and the latest 6 BTC block hashes.
  - It is not a VRF in the cryptographic sense: there is no secret key. **`verify()` is hard-coded to `return true`** (`kktp/engine/kaspa/vrf/vrfFacade.js:196-198`).
- **The `voice` branch adds voice chat, not voice control.** Opus audio is captured with `MediaRecorder`, encrypted with a DH-derived key and chunked into **Kaspa transaction payloads**. It supports push-to-talk ("request-to-talk" plus lease) and a full-duplex "live" mode.
  - It is **not wired into the DAG Dasher UI**. It exists only as an SDK module plus a 2-peer test dashboard.
  - The branch also breaks the game on case-sensitive hosts: **207 imports** use camelCase paths while the files are still PascalCase.
- **Visuals are 100% procedural three.js primitives.** There are **no 3D models, no textures and no custom shaders**. The only post-processing is an `UnrealBloomPass`. The look is neon cyberpunk: dark fog, capsule "bean" player, glowing boxes and emoji sprites.
- **Hackathon result:** it won Kaspathon (296 hackers, 49 BUIDLs). It took **#1 Main Prize (35,000 KAS)**, the **Gaming & Interactive category (16,666 KAS)** and a Top-10 finalist spot (kaspathon.com; DoraHacks buidl 38375).
  - Judges rewarded the **infrastructure and auditability story**, not game feel. The author says in the demo video: "the UI isn't exactly perfect… you can go through the platforms… I need to add some interpolation."

---

## 0. End-to-end code trace (entry → menus → lobby → loop → net → results)

Read this first if you want to rebuild the product faithfully. Every step below is a real call path.

### Boot: `kktp/game/index.html`
1. `index.html:383-390` loads an import map that pins `three@0.160.0` from jsDelivr.
2. `:392` starts an inline module that imports `Logger`, `GameFacade`, `WalletPasswordModal` and `KKGameEngine`.
3. URL flags: `?debug`, `?verbose` and `?trace` set log levels (`:399-408`).
4. `init()` (`:563`):
   - Reads `localStorage.ks-wallets` / `ks-wallet-filename`.
   - Shows `WalletPasswordModal.showForUnlock()` or `showForCreate({defaultName:'default_wallet'})` (`:603-621`).
   - Cancel falls back to a throwaway `temp_<ts>` wallet with password `temp_session` (`:667-678`).
5. It creates `new KKGameEngine().init({password, walletName, network: 'testnet-10' | saved, rpcUrl, gameId: 'dag-dasher', gameName: 'DAGDasher'})` (`:649-657`). Inside `kkGameEngine.js:341-491`:
   1. WASM init
   2. wRPC connect (Resolver or custom URL)
   3. open or create the encrypted wallet
   4. build `KaspaAnchorFacade` + `SessionFacade`
   5. start the incoming-payload router and scanner
   6. fetch balance
   7. `initVRF()` (subscribes the block buffer)
   8. wait for the first block
   9. fill the random-bytes pool
   10. `ensureUtxoPoolReady()` splits the UTXO pool
6. WebGL check (`:715-722`), then `new GameFacade(container, {kkGameEngine})` and `game.init()` (`:727-796`). Debug globals are `window.kaspaSurfer` and `window.kkGameEngine` (`:799-800`). The name "kaspaSurfer" betrays the Subway Surfers lineage.
7. `GameFacade.init()` (`GameFacade.js:135-162`) runs:
   - `_setupContainer`
   - `_initRenderer` (SceneManager → PlayerModel → TrackGenerator → ObstacleFactory)
   - `_initCoreSystems` (AudioManager singleton, InputManager on the container, GameEngine, IntegrityMonitor)
   - `_initModules` (HUD, Menu, Session, Lobby, Player, Render presenters + WalletHUD/Modal)
   - `_wireModuleEvents`, `_wireWalletEvents`
   - `showMainMenu()`

### Main menu: `ui/MainMenu.js:76-265`
- Full-screen gradient `rgba(10,10,20,.95)` → `rgba(20,10,30,.98)`.
- Title "DAG Dasher" uses a teal→purple gradient-clipped text at `clamp(2rem,8vw,4rem)`. The sub-title is "BLOCKDAG ANTI-CHEAT GAMING" with 0.3em tracking.
- Three outline buttons, 2px border in the button color, 4px radius. Hover: 20% tint, glow and scale 1.02.
  - SINGLE PLAYER (teal)
  - MULTIPLAYER (purple)
  - SETTINGS (grey)
- Logos: "powered-by-kas.jpg", KKTP circle, Kaspa vibrant. Footer: "Built on Kaspa • ꓘK Kaspa Kinesis • v1.0.0".
- **Settings** (`ui/SettingsMenu.js`) holds only:
  - volume sliders (master / SFX / "Background Music", persisted to localStorage)
  - Network ID dropdown (testnet-10 / testnet-11 / mainnet)
  - Custom Node `ip:port`, which takes effect after restart

### Single player
1. `MenuPresenterEvent.SINGLE_PLAYER` → `GameFacade.startSinglePlayer()` (`:179-208`):
   - `audio.init/loadMusic/resume`
   - `kkGameEngine.prepareUtxoPool()`
   - `_startGameWithRetry('singlePlayer', …)`, 3 attempts with 800 ms·n backoff (`:1337-1379`). Retriable means network, NIST, BTC or 5xx errors (`:1381-1401`).
2. `SessionController.startSinglePlayer()` (`SessionController.js:320-368`):
   - `gameId = SP-…`
   - `startDaa` from the latest block
   - `vrfSeed = getRandom("{gameId}:{startDaa}")`
3. `GameFacade._beginGame()` (`:1148-1212`):
   - shows the HUD
   - **disables input** until two checkpoints both fire: `GENESIS_ANCHORED` and `GAME_START`
   - starts the render loop
   - calls `SessionController.beginGame()`
4. `SessionController.beginGame()` (`:426-528`):
   - "Preparing" overlay
   - `kkGameEngine.startGame({…, customActionMap})`, which fetches the latest block, a NIST pulse and BTC blocks, then broadcasts the **genesis anchor tx**. In SP a failure is tolerated ("degraded mode"); in MP it is fatal.
   - `GameEngine.init()`, IntegrityMonitor start, block subscription, 100 ms HUD tick, **3-2-1 countdown**
5. **Countdown** (`SessionState.js:170-262`):
   - It is a **3.0 s local `requestAnimationFrame` timer** that emits radial progress. Blocks only calibrate the DAA.
   - On completion, `startDaa = last DAA seen locally`, `endDaa = startDaa + 1800`, `COUNTDOWN_COMPLETE` fires (`:236-251`).
   - This is followed by `playCountdownGo`, `GameEngine.startGame()` and `startMusic()` (`SessionController.js:747-759`).
6. **Frame loop.** There are two independent `requestAnimationFrame` loops:
   - **Sim:** `GameEngine._update` (`GameEngine.js:441-473`), with dt capped at 0.1. It runs slowdown recovery → distance → jump/gravity → entity scroll/magnet/despawn → spawn → collisions → powerup expiry.
   - **Render:** `SceneManager.startRenderLoop` (`SceneManager.js:126-152`) → `RenderPresenter._onFrame` (`RenderPresenter.js:124-150`). It copies engine state into the player model, scrolls the track, syncs entity meshes (`ObstacleFactory.updateEntities`, `:98-127`), toggles the finish line and fog, then runs `composer.render()` for bloom.
7. **Block handler** (`SessionController.js:866-937`): each new block with a higher DAA pushes the hash to a 500-entry stream. At most once every 60 s it captures a NIST pulse, then calls `SessionState.updateDaaScore` → `GameEngine.updateDaaScore` (progress + speed ramp + `daa_complete` end).
8. **Input → chain** (`modules/input/PlayerController.js:97-153`):
   1. an optimistic entry in `globalState`
   2. `GameEngine.handleInput`
   3. visual and audio feedback
   4. `await kkGameEngine.recordMove(action, {lane})` → `KaspaAnchorFacade.processMove` updates the per-move hash chain (`blockchain/crypto/vrfManager.js`) and the merkle tree, and queues a packet
   5. the anchor strategy flushes a heartbeat tx every **500 ms** (`blockchain/anchor/anchorStrategy.js:135`)
   - Coin, collision and pickup events are also recorded with `recordEvent` (`SessionController.js:1050-1129`). This is how the opponent learns your coin total.
9. **End:** `GameEngine._endGame(reason)` → `SessionController.endSession` → an immediate `SESSION_END` with `isAnchoring: true` → `GameFacade._onGameEnd` shows the game-over screen at once while the **final anchor** tx is sent in the background (`SessionController.js:534-637`). Retry and Main Menu buttons call `_cleanupGame` (`GameFacade.js:1646-1683`).

### Multiplayer
1. MULTIPLAYER → `showLobbyBrowser` (`GameFacade.js:213-224`) → `LobbyUI` browser view (`ui/LobbyUI.js:283-605`). It contains:
   - "Your Display Name"
   - "Create New Lobby" (name, default "DAG Dasher Lobby"; Max Players 2–8)
   - "Join by Code" (paste the host's code; the button is disabled until the entropy pool is ready: "Preparing… Please wait a moment.")
   - "Available Lobbies" with a SEARCH button
   - BACK
2. **Create:** `LobbyController.create` (`modules/lobby/LobbyController.js:81-133`) → `kkGameEngine.createLobby({gameName:'DAGDasher', gameId:'dag-dasher', maxMembers})`. This broadcasts a discovery anchor, then kicks `prepareUtxoPool()` in the background. The UI shows "Broadcasting to the Kaspa network" (`LobbyUI.js:70-92`).
3. **Search:** `kkGameEngine.searchLobbies(cb)` scans for discovery anchors in the game namespace and appends lobby cards with a JOIN button (`LobbyUI.js:905-975`).
4. **Join:** `kkGameEngine.joinLobby(discovery | code)` → DM handshake → group key. `prepareUtxoPool()` runs in the background (`LobbyController.js:141-180`).
5. **Room** (`LobbyUI.js:607-903`):
   - JOIN CODE box with copy (host)
   - Players list ("(Host)", "✓ Ready" / "Waiting")
   - Chat (Enter to send; each message is an encrypted group tx with 3 retries at 1 s·n backoff, `LobbyController.js:244-271`)
   - LEAVE (red), READY / NOT READY / SENDING… (green), START GAME (host only)
6. **Ready → auto-start:** when every player is ready, the host posts "🎮 All players ready! Starting in 3 seconds..." and calls `_startMultiplayerGame` after 3 s (`GameFacade.js:1411-1444`).
   - The host runs the SP-like flow with a `MP-` gameId, then sends `GAME_START {gameId, startDaa, vrfSeed}` over the group channel (`LobbyController.js:311-328`).
   - Joiners run `_onMultiplayerGameStart` with the host's `gameId`/`startDaa` but **regenerate their own `vrfSeed`** (`SessionController.js:382-392`).
   - Each client then runs its own genesis tx and its own 3 s local countdown, so **each player's 1,800-DAA window starts whenever their own countdown finishes** (`SessionState.js:236-251`). The host's `startDaa` is not used for the run window, so the two runs are offset in wall-clock time.
7. **In-run opponent info:** the only source is opponent heartbeat txs → `kkGameEngine._handleHeartbeatMatch` (`kkGameEngine.js:2264-2338`) → `OPPONENT_HEARTBEAT` / `OPPONENT_MOVE_ANCHORED` → `SessionController._wireOpponentTelemetry` (`:1219-1270`) → `OpponentTelemetry.applyMove` (absolute coin totals from packets, `OpponentTelemetry.js:76-138`). That feeds `IntegrityMonitor.recordOpponentMove` for the 5 s / 15 s liveness shield and the HUD StandingsBar.
8. **End:** each client decides its own result (`GameFacade.js:1446-1525`), shows game-over, then cleans up in the background and returns to the lobby room with all players un-readied (`:1734-1769`).
9. A genesis failure in MP broadcasts `GAME_ABORT` with the message "A player didn't successfully submit their starting transaction. Think of it as a false start…" (`GameFacade.js:1256-1258`).

### Funding reality
- A fresh testnet wallet has 0 KAS. `WalletHUD` then shows "⚠️ TEST MODE - Moves not anchored" (`ui/gameHud/notifications/TestModeWarning.js:40`).
- **Single player still runs**, because the VRF only needs blocks, not funds.
- **Multiplayer needs funds.** A genesis anchor failure is fatal there, as is a UTXO pool not ready within 15 s (`SessionController.js:450-458, 685-706`). The constants budget 0.5 KAS per anchor and assume about 180 KAS of runway for a full race (`constants.js:96-121`); only fees are actually spent because anchors are self-sends.

---

## 0.1 Full-fidelity spec sheet (units: meters-ish world units, seconds)

**World and camera** (`constants.js`, `SceneManager.js`, `TrackGenerator.js`)
- Lanes: x = −2.5 / 0 / +2.5. Track is 7.5 wide. Neon lane dividers at x = ±1.25: teal on the left, purple on the right, opacity 0.6.
- The player is fixed at z = 0. The world scrolls +z.
- Track: 8 segments × 50 long. Surface `#111122`, metalness 0.8, roughness 0.4. Teal grid box-lines every 2 u at opacity 0.2.
- Edge strips: 30 boxes of 0.1×0.2×0.5 at 3 u spacing, alternating teal/purple, opacity pulsing `sin(t·2 + i·0.5)`.
- Camera: `PerspectiveCamera(75, aspect, 0.1, 1000)` at (0, 5, 10), `lookAt(0, 0, −10)`. Static: no follow, no shake. **Portrait mode widens FOV ×1.2** (`SceneManager.js:354-360`).
- Background and fog: `#0a0a0f`, fog 30→150 (fog debuff 5→35).
- 200 white `Points` stars (size 0.3, opacity 0.6) in a 200-wide box.
- 10 dark `#0a0a15` box buildings (10–40 tall) at |x| 15–35, with random teal/purple window quads.
- Renderer: antialias, DPR ≤ 2, sRGB, ACES filmic, exposure 1.2, alpha. Bloom strength 1.5, radius 0.4, threshold 0.6.
- Lights: Ambient teal 0.4; Directional white 0.8 at (5, 10, 5); Point purple 0.5 r50 at (−5, 5, −10); Point teal 0.3 r30 at (0, 3, 5).

**Player** (`PlayerModel.js`, `PhysicsSystem.js`, `constants.js`)
- Mesh: capsule r 0.3 / len 0.6 (teal, emissive 0.3, metal 0.7, rough 0.2, tilted −0.1π), head sphere r 0.2 purple at y 0.55, eyes r 0.05 white, back-face glow sphere r 0.6 at opacity 0.15 ± 0.05 pulse, 20-particle trail. Base y = 0.5.
- Lane change: logic is instant. Visual moves at 12 u/s (about 0.21 s per lane) with roll = −dx·0.3.
- Jump: v₀ 12, g 30 (apex 2.4, airtime 0.8 s). The squash on jump is x 1.3 / y 0.7, lerping back at 0.1/frame.
- Duck: collision height 1.0 → 0.3. Visual scale (1.5, 0.3, 1.5) at y 0.25. Held until key-up, or until a jump on mobile.
- Hit: 1 s i-frames, speed ×0.5 for 1.5 s, −10 coins.

**Speed and timing**
- Speed = 15 + 25·progress u/s. Speed boost ×1.5, slow ×0.6.
- Run length is 1,800 DAA (about 180 s).
- Spawns: every ≥ 1.5 s at z = −60, with a minimum 15 u gap from the furthest entity. Despawn at z > 10.
- Input cooldown 100 ms. Swipe ≥ 50 px within 300 ms, **evaluated on `touchend`** (`InputManager.js:303-340`).

**Entity visuals** (`ObstacleFactory.js`)
- Barrier: `BoxGeometry(2, h, 0.3)`, emissive pulse `0.3 + 0.1·sin(8t)`, glow box ×1.2. Arrow or X indicators come from `ShapeGeometry`.
- Coin: `Torus(0.25, 0.08)` gold with a glow sphere r 0.2. Spins 2 rad/s, bobs ±0.1 at 4 Hz (±0.25 at 5 Hz when high).
- Pickup: disc r 0.42 + an emoji `CanvasTexture` sprite 0.9 + ring r 0.5. Spins 1.5 rad/s, scale pulse ±0.1 at 4 Hz, bobs ±0.15.
- Platform: box with a top glow plane, edge lines and a bobbing cone arrow.
- Mesh pools are pre-built: 15 barriers, 10 coins, 5 pickups (`ObstacleFactory.js:146-167`).

**Audio (Web Audio synth)** (`AudioManager.js:225-505`, `constants.js:469-489`)
- Coin: two sines, 880 and 1108.73 Hz, 30 ms apart, 0.1 s.
- Collision: triangle 110→40 Hz, 0.3 s, plus a noise burst.
- Powerup: C5-E5-G5 arpeggio, 0.4 s. Powerdown: G4-Eb4-Bb3 descent.
- Jump: 440→880 sweep.
- Also a lane-switch blip, countdown ticks and a GO sweep.
- Mix: master 0.7, music 0.4, SFX 0.8.

**HUD** (`ui/gameHud/components/*`)
- TopBar: ◆ coin counter and 🛡️ integrity shield.
- ProgressBar: 🏁 marker, "N blocks" remaining, an "Opponent" marker, ⏱️ `M:SS.cc` race timer.
- StandingsBar: "#1 / #2 · name · coins🪙 · %".
- Also: CountdownOverlay (radial 3-2-1, "GO!"), SpeedDisplay, PowerupIndicator (tip text plus remaining time), TouchHint, a DOM "+10" CollectionEffect, PauseMenu, GameOverScreen ("🏆 VICTORY!" gold / "YOU LOST" red / "GAME OVER" teal, with "Race Complete!", "Ran out of coins!" or "Opponent ran out of coins!").

---

## 1. What the game actually is

### Genre and premise
**DAG Dasher** (`kktp/game/constants/constants.js:142-143`: `NAME: "DAG Dasher"`, `TAGLINE: "Anti-cheat runner on Kaspa's DAG"`) is a third-person, **3-lane auto-runner**:

- The camera sits behind and above the player: FOV 75, position (0, 5, 10), looking at z = −10 (`renderer/SceneManager.js:271-287`).
- The player stays at z = 0. The world, meaning obstacles and track segments, moves toward the player at `speed` units/s (`engine/EntityManager.js:159-210`).

The "race" framing is misleading if you read only the README:

| What you'd assume | What the code does |
|---|---|
| Faster running wins the race | `progress = (currentDAA − startDAA) / 1800` (`engine/GameEngine.js:318-354`). Progress depends only on blocks elapsed. |
| Speed matters | Speed ramps 15 → 40 u/s with progress (`GameEngine.js:336`). It changes only how fast entities scroll toward you, which is a difficulty ramp. The "Slow" debuff's tip, "Harder to finish!", is cosmetic: it cannot delay the finish. |
| You see your rival | The opponent is not in the scene. Only `StandingsBar` and `ProgressBar` show them (`ui/gameHud/components/`). |

### Controls (`constants.js:447-463`, `input/InputManager.js`)

| Action | Keyboard | Touch |
|---|---|---|
| Lane left / right | ← / A, → / D | swipe left/right (≥ 50 px within 300 ms) |
| Jump | ↑ / W / Space | swipe up |
| Duck (hold) | ↓ / S (release ends duck) | swipe down. A jump cancels the duck, because mobile has no key-up (`engine/PlayerPhysicsMixin.js:111-117`). |
| Pause / settings | Esc / P | HUD button |

- There is a 100 ms action cooldown.
- The "Reverse" debuff swaps left↔right and jump↔duck (`InputManager.js:176-183`).

### Entities and rules
Spawning (`engine/EntityManager.js:215-255`) happens at most once every **1.5 s**, 60 units ahead. Each spawn draws one "VRF" random number:

| Roll | Spawn |
|---|---|
| 30% | Obstacle |
| 10% | Platform (you can land on it; it may carry coins or a pickup) |
| 35% | Coin (ground or airborne) |
| 15% | Pickup |
| 10% | Nothing |

**Barrier grammar.** The color tells you the required action (`constants.js:229-357`). This is the single best readability idea in the game.

| Color | Meaning | Variants |
|---|---|---|
| Cyan `#00FFFF` | JUMP | single / double / full-width |
| Yellow `#FFFF00` | DUCK (overhead bar) | single / double / full-width |
| Red `#FF2244` | MOVE: 4 m tall, unjumpable, red X indicator | single / "wall double" (left + right blocked, centre safe) |
| Purple `#9945FF` | STRICT DUCK: tall, can't jump over | full-width |

Lane patterns are rotated by a second random roll (`EntityManager.js:269-282`).

**Platforms.** There are four sizes: 3 / 6 / 12 / 18 m long, purple, blue, teal and gold (`constants.js:366-399`).
- Running into one auto-mounts you ("solid object", `engine/PhysicsSystem.js:416-458`).
- There is a 60% chance of a coin line on top, 30% chance of a pickup, 10% empty.

**Pickups** (`constants.js:407-441`). The type is drawn uniformly from 7 types, so the split is 4/7 positive, not the 50/50 the README claims.
- Buffs: Speed Boost ×1.5 for 5 s, Coin Magnet 8 s, Shield 6 s (absorbs one hit), Double Coins 5 s.
- Debuffs: Slow ×0.6 for 4 s, Reverse Controls 3 s, Fog 5 s (fog near/far goes from 30/150 to 5/35, `SceneManager.js:185-199`).

**Scoring and failure** (`PhysicsSystem.js:258-343`).
- Each coin is worth +10, or +20 with Double Coins.
- An obstacle hit costs −10 coins, applies a 50% speed cut for 1.5 s and grants 1 s of invulnerability.
- **You start with 0 coins** (`constants.js:152`). **A hit at ≤ 0 coins ends your run with `coins_depleted`.** Your first hit before you have collected anything is instant death.

### Win conditions
- **Single player** (`GameFacade.js:1486-1490`): you win if the DAA clock reaches the end (`daa_complete`), which means you survived about 3 minutes. You lose on `coins_depleted`. A finish line appears at 98% progress (`TrackGenerator.js:131-140`). A confetti-and-trophy celebration plays on victory.
- **Multiplayer** (`GameFacade.js:1446-1563`, `_compareStandings`):
  - If the opponent is out (0 coins), you win.
  - If you are at 0 coins, you lose.
  - Otherwise higher progress wins, with coins as the tie-break.
- **Bug-level caveat on progress.** The `SessionController` pushes progress with `this._kkGameEngine?.setProgress?.(progress)` (`modules/session/SessionController.js:1137`), but `KKGameEngine` **has no `setProgress`**. Opponent progress is therefore never transmitted.
  - `OpponentTelemetry` falls back to *your own* progress (`SessionController.js:1293-1305`).
  - At the end, "my progress = 1.0 vs opponent's last-seen value" can make **both clients show VICTORY**.
  - There is no authoritative settlement anywhere.
- An **integrity monitor** (`integrity/IntegrityMonitor.js`) shows a green, orange or red shield. Orange appears after 5 s without opponent txs. After 15 s you **auto-forfeit** the opponent.

### Screen-by-screen flow
1. **Loading screen** (`kktp/game/index.html:335-343`): "Checking existing wallets…".
2. **Wallet password modal** (`ui/WalletPasswordModal.js`): create or unlock a browser-side Kaspa wallet, stored encrypted in IndexedDB/localStorage (`ks-wallets`, `ks-wallet-filename`). Cancel creates a temp wallet.
3. **Connecting**: kaspa-wasm init (11 MB) → public node resolver on **testnet-10** or a custom `ip:port` → VRF block subscription → UTXO pool split (15 UTXOs). The hint text admits that public nodes are slow.
4. **Main menu** (`ui/MainMenu.js`): Single Player / Multiplayer / Settings. The wallet HUD (balance, address, send, reveal mnemonic, delete wallet) is always visible.
5. **Single player**: the "Preparing Run… Syncing entropy from the chain" overlay covers genesis anchor tx plus NIST/BTC fetch, with up to 3 retries. It is followed by a 3-2-1-GO countdown (local timer calibrated against blocks), then the run.
6. **Multiplayer**: lobby browser. You can search on-chain discovery anchors or join by code, meaning the host's block hash.
   - Next comes the lobby room with player list, encrypted chat and ready toggles.
   - The host auto-starts 3 s after all players are ready, broadcasting `startDaa`, `gameId` and `vrfSeed`.
   - Then the run, with a standings bar and opponent progress marker.
7. **Game over** (`ui/gameHud/components/GameOverScreen.js`): VICTORY / YOU LOST / GAME OVER, coins, race time, final anchor tx id (with an "Anchoring…" spinner) and an explorer link.
   - Buttons: Retry (SP), return to lobby (MP) and **Audit**.
8. **Audit view** (`ui/AuditView.js`, `ui/audit/*`, about 3.2k lines): pulls the game's anchor chain (genesis → heartbeats → final) from the chain.
   - It runs `auditCheating()`: merkle roots, DAA bounds, entropy sources, VRF hash chain and result-hash consistency.
   - It shows NIST beacon signature info and dumps raw crypto data. It is well built for a transparency pitch.

---

## 2. What the `voice` branch adds

**Diff vs `main`** (`gh api …/compare/main...voice`): 32 commits ahead. The big items:

1. **`feat(voice): added voice chat`** (`1b5f057`, 2026-02-27): new `kktp/voice/` module, about 1.9k lines.
2. **`refactor(voice): continuation-aware batching`** (`408627f`): gapless full-duplex playback.
3. **`feat(web): switch to HTTPS by default`** (`2955f88`): `server-https.js`, `scripts/generate-cert.js`, `mkcert.exe` (a 4.9 MB Windows binary committed to the repo) and `HTTPS.md`. This exists because `getUserMedia` needs a secure context.
4. About 29 earlier engine commits:
   - sovereign game namespaces (`gameId`-tagged payload prefixes)
   - `autoHeartbeat` / `anchorHeartbeatNow`
   - BinaryPacker move-encoding unification
   - audit/lobby/blockchain unit tests and HTML test dashboards
   - `core/metrics.js`, `core/randomBytes.js`, `core/conversions.js`
   - a BTC-blocks proxy route (`app/api/proxy/btc-blocks/route.ts`)
   - a camelCase filename refactor (`7091aa7`)

**The voice feature is voice chat, not voice control**:

| Piece | File | What it does |
|---|---|---|
| Config | `kktp/voice/config/voiceConstants.js` | Prefixes `KKTP:V:RTT:` / `KKTP:V:AUDIO:`, session-scoped as `KKTP:V:{groupMailboxId}:…`. Opus 24 kbps, 32 KB payload cap, 300–500 ms jitter buffer, 20 s talk lease. |
| Capture/encode | `voice/audio/audioCapture.js`, `opusEncoder.js` | `getUserMedia` (AEC/NS/AGC in live mode) → `MediaRecorder` `audio/webm;codecs=opus`, 100 ms timeslices |
| Crypto | `voice/crypto/voiceSession.js` | Voice DH keypair (key index 200), key exchange over the encrypted lobby channel, key derived with salt `KKTP:voice:1` + first RTT queue position (replay binding) |
| Floor control | `voice/rtt/requestToTalk.js`, `confirmationWatcher.js`, `lease/leaseManager.js` | "Request-to-talk" = send a tx, wait for block inclusion, use `(blueScore, txIndexInBlock)` as a **DAG-ordered queue position**, hold a 20 s lease. This is walkie-talkie mode. |
| Transport | `voice/tx/voiceTxSender.js`, `payload/voicePayloadFormat.js` | Every audio chunk is **its own Kaspa transaction** |
| Live mode | `voiceFacade.js:223-420` | Full duplex. It restarts `MediaRecorder` every **350 ms** so each window is a standalone decodable WebM, runs RMS VAD to drop silence, sends one tx per window and sends an RTT "presence" heartbeat every 60 s. |
| Playback | `voice/playback/audioPlayback.js`, `opusDecoder.js` | `decodeAudioData` → ordered by queue position + chunk index. There is a jitter buffer for the first batch, then gapless scheduling (the continuation-aware batching). |
| Engine hook | `kkGameEngine.js:2205` (routes `KKTP:V:` payloads), `:2511-2527` (`registerVoiceHandler`) | |
| Test UI | `kktp/voice/tests/dashboard.html` + `dashboardController.js` ("KKTP Voice Live Test (Two-Peer)") | The only UI that uses voice |

- **No spatial audio.** Playback goes straight to the destination.
- **Not integrated in DAG Dasher.** No file under `kktp/game/` references `VoiceFacade`.
- **Latency floor** equals Kaspa tx propagation and inclusion time, plus the 350 ms window, plus the 400 ms jitter buffer. That is walkie-talkie latency, not conversational latency.
- **Cost:** about 3 tx/s per speaker. This works only because Kaspa fees are near zero on testnet.

**Regression on `voice`:** the camelCase refactor changed imports (`./gameFacade.js`, `../core/eventEmitter.js`, …) but git on a case-insensitive filesystem never renamed the files. There are **207 case-mismatched relative imports** under `kktp/` (checked with a script against the tree; the GitHub tree also lists `GameEngine.js`, `EventEmitter.js`).
- On `main` the imports are PascalCase and consistent.
- `voice` will only run on macOS or Windows dev boxes. The live Vercel deploy is presumably from `main`.

---

## 3. Architecture

### Stack
- **Website:** Next.js 15 / React 19 / Tailwind / framer-motion / lucide.
  - Marketing sections are in `components/sections/*`.
  - Demo pages: `/vrf-demo`, `/relay-demo`, `/nist-tests`, plus prebuilt esbuild SPA bundles in `public/spa/*.js`.
- **Game: plain browser ES modules, no bundler.**
  - `app/kktp/game/[...path]/route.ts` + `_serveGameFile.ts` is a Node route that **reads files from disk and serves them with `Cache-Control: no-store`**.
  - `index.html` uses an **import map** that pulls **three.js 0.160.0 from jsDelivr** (`kktp/game/index.html:383-390`).
  - UI is **hand-built DOM with inline `style.cssText`** (no React in-game).
- **Architecture pattern:** a Facade / Controller / Presenter split.
  - `GameFacade.js` (1,772 lines) orchestrates:
    - `SessionController` (lifecycle, DAA clock, VRF seed, anchors)
    - `LobbyController`
    - `PlayerController` (input → engine → `recordMove`)
    - `HUDPresenter` / `MenuPresenter` (DOM)
    - `RenderPresenter` (three.js)
  - `GameEngine` is built from mixins (`EntityManager`, `PhysicsSystem`, `EntropySource`, `PlayerPhysicsMixin`, `PowerupSystem`) via `Object.assign(prototype, …)` (`engine/GameEngine.js:575-579`).
- **Blockchain layer (`kktp/`, about 1 MB of JS excluding tests and wasm):**
  - `KKGameEngine` (`kkGameEngine.js`, 2,531 lines) is the "single entry point" SDK facade.
  - Below it: `KaspaAdapter` → `KaspaPortal` (`engine/kaspa/kaspaPortal.js`), the transport, wallet, scanner and indexer ("intelligence"), all built on the **official Rusty-Kaspa WASM SDK** (`engine/kaspa/kas-wasm/kaspa.js` + `kaspa_bg.wasm`, ISC license, Kaspa developers).

### Client/server and netcode
- **Zero servers.** Every client runs a full wallet and connects over wRPC to a public Kaspa node (via `Resolver`) or a user-supplied node (`engine/kaspa/transport/kaspa_client.js:44-60`).
- **Messages are transactions.** Each client sends small self-transfers (`ANCHOR_AMOUNT '0.5'` KAS to its own UTXO pool; only the fee is spent) whose **payload** carries data. Every client runs a **scanner** that filters new blocks by payload prefix (`KKTP:GROUP:…`, `KKTP:V:…`, heartbeat hex prefix + gameId tag) and routes matches (`kkGameEngine.js:2158-2262`).
- **Gameplay sync:**
  - Each client simulates its own run locally, with no rollback and no lockstep.
  - Every **500 ms** it batches moves and events into a binary **heartbeat anchor** tx (`BLOCKCHAIN.ANCHOR_BATCH_MS: 500`, `blockchain/anchor/anchorStrategy.js:135`).
  - The opponent parses those heartbeats (`_handleHeartbeatMatch`, `kkGameEngine.js:2264`) to update coins and liveness only.
  - The author reports that the indexer re-syncs every about 5 s and admits the need for interpolation (demo video).
- **Anchor protocol (v4/v5)** (`constants.js:653-826`). A three-tx proof chain per player:
  - **GENESIS** (890 B): gameId hash, hashed seed, 6 BTC block hashes, start/end DAA, NIST pulse index + SHA-512 output + 512-byte RSA-PSS signature, initial VRF output.
  - **HEARTBEAT**: merkle root, prevTxId, 8-byte move packets (action | lane | timeΔ | VRF fragment | coins total), optional BTC/NIST deltas.
  - **FINAL** (144 B): final merkle root, genesis ref, result leaf hash, score, coins, race ms, outcome code.
- **Rooms/lobbies** (`kktp/lobby/*`, `README.md`):
  1. The host posts a **discovery anchor**.
  2. A joiner opens an encrypted 1:1 DM (DH + XChaCha20-Poly1305).
  3. The host replies with a **group key** over DM.
  4. Group chat and control messages are encrypted with the group key. Keys rotate every 10 min.
  - The join code is the host's discovery block hash. There is a `maxPlayers` UI (2–8), but `LOBBY.MAX_PLAYERS: 2` and the standings logic assume 1v1.
  - The IETF-style spec is `kktp/protocol/docs/KKTP_PROTOCOL.md` (995 lines), also published as `draft-koding-kktp-00`.
- **Persistence:** none server-side. The wallet lives in browser storage. The game record lives **on-chain as anchor txs**, which the audit view re-fetches.

### Randomness and fairness mechanism (the "VRF")
- `VRFFacade.prove({seedInput, btcBlocks: 6, kasBlocks: 12, iterations: 2})` (`vrfFacade.js:183-191`) → `generateFoldedEntropy`:
  - It fetches the **current NIST beacon pulse** (split into 2 × 256-bit sources), the **12 newest Kaspa block hashes from a rolling in-memory buffer** (`vrf/core/fetcher/kaspa.js:175-205`) and **6 BTC block hashes** (mempool.space or a proxy, cached).
  - It runs bit-position "recursive folding" with SHA-256 seeded by `sha256(seed)` (`vrf/core/folding.js`), then `sha256(result)`.
- `KKGameEngine.getRandom({seed})` wraps this (`kkGameEngine.js:1090-1122`).
- **Game use:**
  - The session seed is `getRandom("{gameId}:{startDaa}")` (`SessionController.js:830-837`).
  - After that, `EntropySource` pre-fetches batches of 16 outputs for `"{seed}:{counter}"` into a queue that sync gameplay code consumes. It **throws if the queue is empty**, with no fallback (`engine/EntropySource.js:69-129`).
- **Honest assessment:**
  1. **Not a VRF.** There is no private key and no uniqueness proof. It is a commit-free mix of public beacons. `verify()` literally short-circuits to `true` with the comment "I can't figure this out yet" (`vrfFacade.js:196-198`).
  2. **Not reproducible across players.** Kaspa produces 10 blocks/s, so each `prove()` call sees a different 12-block window. The host and the joiner each compute their own `vrfSeed` locally at different moments (`SessionController.js:382-392`), and each refill samples the chain at a different time.
     - The **two players almost certainly run different obstacle courses**. The host does broadcast its `vrfSeed` (`GameFacade.js:1243-1247`), but the joiner's `startMultiplayer` ignores it and regenerates.
  3. **Not replayable.** Spawn timing uses `Date.now()` cooldowns and frame-rate-dependent distances (`EntityManager.js:216-229`). The same random stream therefore yields different layouts at different frame rates.
     - The audit replays the *hash chain* of VRF fragments (`audit/cheating/vrfChain.js`), not the gameplay. The coin count in the FINAL anchor is **self-reported**. `finalResult.js` only checks that `SHA256("RESULT:score:coins:outcome:ms")` matches the same self-reported fields.
  4. What it does give you is **public timestamping and commitment**: moves are merkle-committed and anchored every 500 ms, with a publicly inspectable entropy trail. That is useful for *post-hoc anomaly detection*, which is what the author claims. It does not prevent a modified client from lying.

---

## 4. Visual design, assets, UI

**Art direction:** "Kaspa cyberpunk". The palette is teal `#00d9ff` (Kaspa brand), purple `#9945ff`, neon pink, green and gold, on near-black `#0a0a0f` (`constants.js:12-68`).
- ACES filmic tone mapping at exposure 1.2.
- Fog runs from 30 to 150 units.
- Lighting: teal ambient, one white directional light, a purple accent point light and a teal front point light (`SceneManager.js:289-312`).
- **Bloom** is `UnrealBloomPass` at strength 1.5, radius 0.4, threshold 0.6 (`SceneManager.js:314-336`). Quality presets exist in `RENDERER.QUALITY` but are not wired; bloom is always on.
- Shadows are off.

**3D asset inventory: zero authored 3D assets.** Everything is built from code:

| Element | Construction | File |
|---|---|---|
| Player | `CapsuleGeometry` body (teal, metal 0.7) + purple sphere head + 2 white eye spheres + a back-face glow sphere + 20 sphere "trail" particles. Animation is squash/stretch on jump, flatten on duck, lane-switch tilt and a breathing pulse. | `renderer/PlayerModel.js:181-306` |
| Track | Scrolling `PlaneGeometry` segments (50 m × 6), box grid lines, lane dividers, edge lights | `renderer/TrackGenerator.js:191-350` |
| Skyline | 200 `Points` stars, plus 10 dark box "buildings" with random lit window planes | `TrackGenerator.js:350-440` |
| Barriers | `BoxGeometry` + glow box + `ShapeGeometry` arrows / X indicators | `renderer/ObstacleFactory.js:197-450` |
| Coins | `TorusGeometry` gold + glow sphere | `ObstacleFactory.js:472-495` |
| Pickups | `CircleGeometry` disc + **emoji rendered to `CanvasTexture` → `Sprite`** (⚡🧲🛡️💰🐢🔄🌫️) + torus ring | `ObstacleFactory.js:517-640` |
| Platforms | Box / extruded shape + `EdgesGeometry` outline + top glow plane + cone arrows | `ObstacleFactory.js:684-760` |
| Finish line, confetti, trophy | Procedural | `TrackGenerator.js:128-190` |

- **Shaders:** none custom. The game uses `MeshStandardMaterial`, `MeshBasicMaterial`, `PointsMaterial` and `SpriteMaterial`.
- **Formats and loaders:** no GLTF, FBX or texture loading. The static server's `.glb` MIME entry is unused.

**2D and media assets.** Provenance is thin, and **MIT does not automatically cover the art or music**:

| File | Size | Notes |
|---|---|---|
| `kktp/game/assets/audio/mind-on-my-kaspa.mp3` | 5.6 MB, 3:29, 48 kHz stereo 216 kbps | **Only music track.** `attributions.txt` credits "Unknown Kaspian". It is a sung crypto parody track ("Mind on my Kaspa", riffing on "Mind on My Money"). **License unknown**, so do not reuse it. |
| `kktp/game/assets/images/powered-by-kas.jpg` | 45 KB, 680² | Credited "THEKRYPTOLEIDY". License unstated. |
| `kktp/game/assets/images/kaspa-logo-vibrant.webp` | 109 KB | Kaspa community brand mark |
| `kktp/game/assets/images/kktp-logo-circle.png`, `web/assets/images/kk-logo-circle.png` | 566 KB each (1024² PNG), duplicated | Project logo |
| `web/assets/videos/short-starting-clip.mp4` / `anti-cheat-audit.mp4` | 14.3 MB / 12.3 MB | Demo videos for the site |

**UI:**
- **In-game:** imperative DOM. Examples: `ui/gameHud/components/{TopBar, ProgressBar, StandingsBar, SpeedDisplay, PowerupIndicator, CountdownOverlay, GameOverScreen, PauseMenu, TouchHint}.js`, plus toasts, UTXO-refresh notices, "test mode" low-funds warning and anchor-retry modal.
  - Typography is `Segoe UI` / system fonts, with glassy dark panels, teal borders and glow text-shadows. It is functional but dated. Heavy emoji use.
- **Website:** polished Tailwind landing page (hero, problem/solution, architecture diagram, economics, FAQ, demo video). This is where most of the visual polish went.

---

## 5. Audio

- **Library:** raw **Web Audio API** (`audio/AudioManager.js`, 22 KB). No Howler or Tone.
- **SFX are all synthesized with oscillators**, so there are no sample files. Frequencies are in `constants.js:469-489`:
  - coin: A5→C#6 arpeggio
  - collision: 110 Hz thud
  - powerup: C-E-G major chord
  - powerdown: G-Eb-Bb minor descent
  - jump: A4→A5 sweep
  - countdown ticks and GO
- **Music:** loads the 5.6 MB MP3 via `fetch` + `decodeAudioData` and loops it (`AudioManager.js:512-565`).
  - Fully decoding 209 s of 48 kHz stereo float32 holds **about 80 MB of PCM in RAM**.
  - The fallback is a synthesized 128 BPM sawtooth bass and kick loop. `setSpeedMultiplier` only affects that fallback, not the MP3.
- **Spatial audio:** none. Nothing uses `PannerNode`, and the voice-chat playback is also non-spatial.

---

## 6. Physics, movement feel, AI

- **Custom kinematic "physics"** (`engine/PhysicsSystem.js`). There is no physics engine. The game loop is `requestAnimationFrame` with dt capped at 0.1 s (`GameEngine.js:441-473`).
- **Jump:** v₀ = 12, g = 30, which gives about 0.8 s airtime and 2.4 u apex. It is floaty-arcade and fine.
- **Lane switch:** the logic is **instant** (`PlayerPhysicsMixin.js:89-100`). The visual lerps at 12 u/s with a tilt (`PlayerModel.js:97-130`), so collision and visuals can disagree for about 200 ms.
- **Collision:** lane equality plus |z| < 1.5 plus a y-overlap test. There is no grace window on obstacles ("must dodge precisely", `PhysicsSystem.js:224`).
- **Platforms:** auto-mount when you run into them, with falling-off detection. The author admits clipping bugs ("you can go through the platforms").
- **Feel:** readable but weightless. There is no camera shake, no hit-stop, no FOV kick on speed, no particles on impact (only a DOM "+10" pop in `ui/gameHud/effects/CollectionEffect.js`) and no footstep or animation rig. The capsule has no run cycle.
- **Bots/AI:** **none.** Single player is solo survival against the block clock. There are no ghost opponents or AI runners.

---

## 7. Performance and loading

**Repo weight: about 106 MB**, broken down as:
- `.git` about 30 MB
- `web/assets` 26 MB (two MP4s)
- `web/public` 25 MB:
  - `kaspa_bg.wasm` 11 MB
  - 3 SPA bundles about 5.1 MB, plus about 9.5 MB of **committed sourcemaps**
- `web/kktp` 20 MB (a **second copy** of the 11 MB `kaspa_bg.wasm`, the 5.6 MB MP3, 566 KB PNG)
- `mkcert.exe` 4.9 MB

**Game cold load**, measured from the code rather than profiled:

| Component | Size | Notes |
|---|---|---|
| Kaspa WASM SDK | ~11 MB `kaspa_bg.wasm` + 479 KB `kaspa.js` glue | Must load and compile before anything else. It is the heaviest part by far. |
| Unbundled game ES modules | ~75 modules, ~660 KB | Unminified, loaded as separate requests |
| `kktp` SDK modules | ~130 more modules, ~1 MB | Same |
| three.js 0.160 | ~1.2 MB unminified module + postprocessing addons | From jsDelivr (third-party runtime dependency) |
| Music | 5.6 MB MP3 | Loaded when you press Single Player or Multiplayer |

- Everything is served **`Cache-Control: no-store`** (`app/kktp/game/_serveGameFile.ts`), so repeat visits re-download it all.
- **Network-bound startup** comes on top of the downloads:
  - wallet decrypt
  - wRPC connect through the public resolver (timeouts up to 40 s, `kkGameEngine.js:66-77`)
  - waiting for first block
  - UTXO split tx
  - then, per game: NIST beacon fetch + BTC blocks fetch + genesis anchor tx (with 3× retry)
  - The on-screen hints apologize for slow public nodes. Time-to-first-run is realistically **tens of seconds**.
- **Runtime:**
  - One draw call per mesh, no instancing. Barrier, coin and pickup meshes are pooled (`ObstacleFactory.js:146-167`), but a pooled barrier still rebuilds its `BoxGeometry` whenever the barrier height changes (`:244-300`). Indicators, platforms and the 20 trail spheres are separate meshes, and each has its own material. Logic entity objects are also pooled (`EntityManager.js:26-107`).
  - Bloom is full-screen at DPR ≤ 2.
  - Fine on desktop. Mobile GPUs will struggle with bloom plus per-entity materials.
  - A 100 ms `setInterval` HUD tick, the 500 ms anchor tx loop and the per-block handler all run alongside the render loop.

---

## 8. Reusable vs rewrite (for a Base / Chain-SDK casino arena)

| Keep / borrow (ideas or small code) | Why |
|---|---|
| **Color-as-verb barrier grammar** (`constants.js:229-357`) | Instantly readable: cyan = jump, yellow = duck, red = move, purple = strict duck. Good for fast wager rounds. |
| **Lane rotation of bitmask patterns** (`EntityManager.js:269-282`) | A cheap way to get variety from a small template set |
| **Mystery pickup = visible gamble** (4 buffs / 3 debuffs; emoji sprite on disc, `ObstacleFactory.js:517-640`) | Micro-risk moments inside a round; maps naturally to "VRF reveal" beats |
| **Chain-clock framing**: race length in blocks, countdown calibrated to blocks | A compelling "the chain is the referee" story. On Base (~2 s blocks) use VRF-request → fulfillment as the "starter pistol". |
| **Audit / "verify, don't trust" screen** (`ui/AuditView.js`, `ui/audit/*`) | Judges liked it. For us: a post-round panel with VRF request tx, fulfillment tx, seed, derived outcome and payout tx. |
| **Game-over UX** with an anchoring spinner then tx link (`GameOverScreen.js`) | The same pattern suits waiting on VRF callback or settlement confirmation |
| **Three-anchor commit pattern** (genesis → heartbeats → final) | A conceptual template if we log skill inputs for dispute or replay |
| **Object pooling for runner entities** (`EntityManager.js:26-107`) | Small, correct and reusable |

| Rewrite / avoid | Why |
|---|---|
| Entire `kktp` transport / lobby / voice stack | Kaspa-specific: txs as messages, UTXO pools, wasm wallet. Irrelevant on Base; use a real realtime server or Colyseus-style rooms. |
| "VRF" (`vrfFacade.js`) | Not a VRF, `verify()` stubbed. Use Chain SDK VRF (or Chainlink/Pyth-style) with on-chain verification. |
| Renderer | Primitive-only and dated. A premium arena needs authored GLB characters, instancing, a real material and lighting pass and VFX. |
| DOM-string UI with inline `cssText` | Hard to maintain or theme. Use React/HTML overlay with a design system. |
| Audio | 80 MB decoded music track of unknown license. Use a streamed `<audio>`/`MediaElementSource` with licensed or original music, and keep the oscillator SFX idea only for prototyping. |
| Unbundled `no-store` module serving | Bundle, minify, hash and cache. Self-host three.js. |
| Frame-time-based spawning | Must become a deterministic fixed-tick sim if any outcome is to be verifiable |

**Key files:**
- `kktp/game/GameFacade.js` (orchestration; win logic at `:1446-1563`)
- `kktp/game/engine/{GameEngine,EntityManager,PhysicsSystem,EntropySource}.js`
- `kktp/game/constants/constants.js` (all tuning)
- `kktp/game/modules/session/SessionController.js` (DAA clock, seed, anchors)
- `kktp/game/renderer/*.js`
- `kktp/kkGameEngine.js` (SDK facade)
- `kktp/engine/kaspa/vrf/vrfFacade.js` + `core/folding.js` (entropy)
- `kktp/voice/voiceFacade.js`
- `kktp/audit/auditCheating.js`

---

## 9. Weaknesses and what we can do better

1. **The race isn't a race.** Progress comes from block height, so skill only affects survival and coins. *Better:* make outcome-relevant state explicit, whether that is a distance score, a checkpoint count or a survival multiplier, and show it big.
2. **Opponent invisible and stale.** There is no 3D ghost, updates arrive only through 500 ms tx batching plus inclusion latency, and there is no interpolation. *Better:* use a realtime authoritative room (WebSocket) with rendered opponents in a *shared arena*, and keep the chain only for wager, VRF and settlement.
3. **No authoritative settlement.** Each client decides VICTORY locally. The missing `setProgress` means both can "win". *Better:* compute results in one place: an on-chain contract for VRF-only outcomes, or a server that replays deterministic inputs for skill outcomes. Emit a single signed result.
4. **Randomness is not verifiable and not shared.** The two players get different courses. *Better:* one VRF request per round, with its output seeding a deterministic PRNG (for example xoshiro or PCG) that **both** clients and the verifier run identically.
5. **First hit at 0 coins = instant loss.** That is harsh onboarding and punishes the first 10 seconds. *Better:* give a starting stake or health, or a grace period.
6. **Startup friction.** Wallet creation, 11 MB wasm, public-node connect, UTXO split and a genesis tx all happen before play, taking tens of seconds. *Better:* start rendering immediately, use embedded or smart wallets (Base), and put the wallet prompt only at the wager moment.
7. **Presentation.** Primitive art, no character, no hit feedback, emoji pickups, `Segoe UI` DOM HUD. *Better:* authored stylized characters, impact VFX, camera juice, a coherent type system and a premium lobby.
8. **Engineering hygiene.**
   - The `voice` branch is broken on Linux (case-mismatched imports).
   - Duplicated 11 MB wasm, committed sourcemaps and a committed `mkcert.exe`.
   - `handleInput` is defined twice (`GameEngine.js:270` and the mixin override at `PlayerPhysicsMixin.js:44`).
   - `RENDERER.QUALITY` presets are unused.
   - The README says "50/50 powerup vs powerdown", but the code gives 4/7.
9. **Licensing risk.** The music (unknown artist, parody lyrics) and the "powered by" art have no license. Do not reuse them.

---

## 10. Mapping the core loop to a casino wager round

Chain Jam context: the Chain casino SDK on Base plus VRF, with a fixed-RTP settlement model. We haven't verified the exact SDK API here; the analysis below assumes "bet in → VRF request → callback determines outcome → payout at house edge".

### The core conflict
DAG Dasher's outcome is **skill-determined**: dodging decides coins and survival. Randomness only lays out the course. A fixed-RTP casino game requires **outcome = f(VRF output)** and nothing else, so the house edge is provable and constant.
- If player skill can move the payout, then a skilled or botted player gets RTP above 100% and the house bleeds.
- Anti-cheat becomes the whole problem. KaspaKinesis shows this: its "audit" can't actually prove the coin count because the sim isn't deterministic and the client self-reports.

### Honest options

| Option | Round flow | Fixed RTP? | Skill? | Verdict |
|---|---|---|---|---|
| **A. "Dash-Crash" (cash-out runner)** | Wager → VRF sets a hidden **bust distance** (crash point from a standard crash distribution with house edge) → the runner auto-runs as a multiplier ticks up (1.00× … ) → the player's only decision is **when to cash out** → bust = the runner hits the "red wall" that was always at the VRF distance. | **Yes.** Identical math to Crash. Cash-out timing doesn't change EV. | Cosmetic dodging, or none | **Most honest fit.** It keeps the runner fantasy and the "chain referee" story. Obstacles become theater and the barrier grammar becomes pure spectacle. |
| **B. VRF-scripted run ("pachinko runner")** | Wager → VRF output → deterministic PRNG generates the course **and the outcome** (which gates open and which pickups are buffs), for example as a path through a multiplier table → the runner plays it out. Player input is cosmetic or limited to picking a lane before a reveal (each lane's result pre-committed by VRF; the choice doesn't change EV). | **Yes** | Illusory | Good for spectacle and short rounds. Must be clearly disclosed as chance. |
| **C. PvP skill wager (pot, not house)** | Both players stake into escrow → **one** VRF seeds an identical deterministic course → both run → an authoritative server replays input logs on a fixed-tick sim → winner takes pot minus rake. | **N/A.** The house isn't a counterparty; revenue = rake. | **Yes** | Closest to DAG Dasher's intent, but it needs deterministic simulation, server-side replay and anti-bot measures. It is also "skill gaming" legally and **doesn't fit a fixed-RTP casino SDK** unless the SDK supports P2P escrow. |
| **D. Hybrid: skill picks the table, VRF picks the result** | Skill earns *which* VRF-settled bet you get: surviving a segment unlocks a higher-multiplier, same-RTP bet. Each individual bet stays fixed-RTP. | **Yes, per bet**, as long as every unlockable bet has the same RTP | Yes (access, not odds) | A workable compromise. Skill changes variance and volatility, not expected value. |

### Recommendations for our arena
- If we borrow from KaspaKinesis, take **Option A or D**:
  - Keep the lane-runner readability and the "verify the round" audit panel.
  - Make the **VRF fulfillment transaction the visible "starter pistol"**.
  - Derive every random event from **one** VRF word through a deterministic PRNG, so the client animation, any spectators and a verifier script all reproduce the same round from `(requestId, randomWord)`.
- Put the chain only where it earns its latency:
  - wager lock → VRF request → callback → payout
- Everything else runs on a normal realtime stack.
- If we keep any skill element, state explicitly in the UI that the payout odds are fixed by VRF and skill only affects which bet you unlock or cosmetic performance.

---

## 11. Making it multiplayer

**Current status: only partly multiplayer.** It is 1v1 (`LOBBY.MAX_PLAYERS: 2`, `constants.js:582`). The opponent is invisible (HUD only), receives data 500 ms late at best (tx batching plus block inclusion plus scanner), and runs a **different course** from you in a **different, offset time window** (sections 0 and 3). What gets "synced" is only the opponent's self-reported coin total and liveness.

### What state exists (and how big it is)
Per player, the full sim state is small (`engine/GameEngine.js:45-97`, `PhysicsSystem.js:32-44`):
- `lane` (0–2)
- `playerY`, `jumpVelocity`
- `isJumping`, `isDucking`, `onPlatform`
- `coins`, `speed`, `distance`
- `activePowerup` + end time
- `collisionSlowdownEndTime`, `lastCollisionTime`

The course is `entities[]` (type, lane, z, y, barrierType or platform type, pickup type).

The inputs are **discrete and rare**: left, right, jump, duck and duck-release, rate-limited to 10/s. The repo already packs each one into an **8-byte packet** (action | lane | timeΔ/4 ms | VRF fragment | coins, `constants.js:653-691`). A 3-minute run is roughly 200–600 inputs, about 5 KB. **Input logs are the cheapest thing to sync or store.**

### What is and isn't deterministic today

| Aspect | Status | Where |
|---|---|---|
| Random stream | Seeded, but not reproducible. `"{seed}:{counter}"` is folded with *live* NIST, Kaspa and BTC data at call time. | `EntropySource.js:101-129`, `vrfFacade.js:84-129` |
| Spawn timing | `Date.now()` cooldown (1.5 s) plus distance gating by the float `z` of the furthest entity | `EntityManager.js:215-229` |
| Movement | Variable-dt `requestAnimationFrame` (dt ≤ 0.1), `Date.now()` for slowdown, i-frames and pickup expiry | `GameEngine.js:441-486`, `PhysicsSystem.js:240-275`, `PowerupSystem.js:34-55` |
| Speed ramp | Driven by **DAA progress**, so it arrives in chunks that depend on block reception | `GameEngine.js:318-354` |
| Round clock | Each client's own `startDaa` after its own countdown | `SessionState.js:236-251` |

**Conclusion:** nothing is replayable. To make any multiplayer mode fair, the first job is a **deterministic fixed-tick sim**:
1. Run at 60 Hz with integer tick counters instead of `Date.now()`.
2. Spawn on **distance traveled** (for example every N ticks or every M units), not wall time.
3. Make speed a function of the tick, not of block height.
4. Draw the whole course from **one seeded PRNG** (for example xoshiro128\*\*) keyed by **one VRF word** per round.

After that, `course = f(seed)` and `result = f(seed, inputLog)`. Every client, a spectator or a server verifier can reproduce any run exactly. The existing code is modular enough (mixins, pure-ish engine with no DOM) that this is a contained refactor. The engine rules and constants can be ported as-is.

### Pattern evaluation

| Pattern | Fit with this codebase | Cost to build | Wager / fairness fit | Verdict |
|---|---|---|---|---|
| **Same-seed simultaneous race** (everyone gets an identical course and random stream) | Natural. The seed plumbing exists (`vrfSeed` broadcast in `GAME_START`, `LobbyController.js:317-323`); it just needs to be honored and made deterministic. | Low–medium (the deterministic refactor above) | **Best.** Identical conditions make it pure skill, and one VRF word per round is auditable. | ✅ Core mode |
| **Live ghosts of other players** | The player mesh is self-contained (`PlayerModel.js`); instance N translucent copies at their lane / y / z-offset. Each client already simulates its own course. Ghosts need only `(tick, lane, y, duck, alive, coins)` at 10–20 Hz, or their input stream re-simulated locally. | Low | Great spectacle. Keep ghosts **non-colliding** so skill stays isolated. | ✅ Pair with same-seed |
| **Direct interference** (drop barriers into rivals' lanes, sabotage pickups) | The pickup system already has debuffs (Slow, Reverse, Fog, `constants.js:417-420`), and "send a debuff to the leader" is easy to wire. But it breaks "identical course" fairness and needs an **authoritative server** to order the effects. | Medium–high | Adds chaos. It muddies skill-wager fairness and invites griefing. | ⚠️ Optional party mode only |
| **Co-op** (shared coin pot or relay runs) | No shared-world concept; the lane runner is inherently solo per track. A relay ("next runner continues at your distance") could work. | Medium | Weak for wagers (no opponent). Okay as a social or casual mode. | ❌ Not a priority |
| **Async ghost challenges** ("beat my run") | Very cheap once deterministic: store `(seed, inputLog)` in about 5 KB and replay it as a ghost. This is what the author's "replay a match to verify fairness" promise needs anyway. | Low | Good for liquidity (no need for simultaneous players). Wager = stake to beat a posted score. | ✅ Strong secondary |
| **Tournament brackets on a shared seed** | Same as async plus a leaderboard per seed. Everyone runs the same daily or round course within a time window. | Low–medium | Good for events. Needs server-side replay verification of submitted logs. | ✅ Later |
| **Bots filling empty slots** | No AI exists. The simplest high-quality bot is a **recorded ghost**: replay real human input logs on the same seed. A rule bot is also easy because barrier color encodes the required action (jump / duck / move); read the next entity in your lane and react with tunable reaction delay and error rate. | Low | Fills lobbies instantly. Must be **clearly labeled**, and bots must never be the counterparty in a wagered pot unless disclosed. | ✅ Needed for launch |

### Recommendation
1. **Primary: a same-seed live race with ghost runners, 2–8 players.**
   - One VRF word seeds everyone's identical course.
   - Everyone runs simultaneously, sees translucent ghosts of rivals in adjacent "phantom" tracks or overlaid on their own lanes, and gets a live standings bar (a real one, not the current fake-progress one).
   - The win metric must be skill-sensitive and synced, for example **distance survived plus coins**, with elimination on a hit at 0 coins, kept from the original.
   - Transport: a realtime room server (WebSocket) relays inputs and ghost states at about 15 Hz. The server replays input logs on the deterministic sim to produce the one authoritative result for settlement.
   - Kaspa-style on-chain relaying is far too slow for this (≥ 500 ms and one tx per update).
2. **Secondary: async "beat my run" challenges and shared-seed tournaments.** These reuse exactly the same deterministic sim plus stored input logs, so they come almost for free once item 1 exists. They keep the arena alive when concurrent players are few, and recorded ghosts double as **bots** for empty seats.

**Casino-compatible twist (ties back to section 10).** If the round must settle at fixed RTP instead of as a PvP pot, use a **multiplayer Dash-Crash**:
- Everyone in the room rides the *same* VRF-seeded run with the *same* hidden bust distance.
- Each player independently chooses when to cash out, with live ghosts showing who cashed out where. This is the proven social pattern of multiplayer crash games.
- It is multiplayer, fixed-RTP and verifiable from one VRF word.
- Skill-based dodging would have to be cosmetic in that mode, so offer it as a separate room type from the skill race.

---

## Sources checked
- Repo code and docs (the `voice` working tree). Branch list, commit history and `compare/main...voice` via `gh api`.
- Live site https://kaspakinesis.vercel.app. The game route `/kktp/game` returned HTTP 200.
- Kaspathon results page https://kaspathon.com (Kaspa Kinesis: #1 Main Prize 35,000 KAS; Gaming & Interactive winner 16,666 KAS; Top-10 finalist).
- DoraHacks https://dorahacks.io/buidl/38375. The author discloses using AI for boilerplate, components and debugging.
- Demo video https://www.youtube.com/watch?v=eMHwJhGVk08 (183 s, 2026-02-12), from auto-captions.
- IETF-style draft `draft-koding-kktp-00`.
