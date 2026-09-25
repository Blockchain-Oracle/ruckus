# xray.games: UX flow teardown

2nd place, Stellar ZK Gaming. Live at https://xray.games (MIT). Author: Fred Kyung-jin Rezeau.
Repo: `references/xray-games` (single commit `f373c33`).

## Sources and how this was read

- **The repo contains no frontend.** `references/xray-games` holds only the Soroban contracts (`contracts/{common,slicer,snooker,runner,mock-ohloss}`) and the ZK circuits (`circuits/{circom,noir}/{slicer,runner}`). There is no client code in it.
- **So the client was read from the deployed bundle.** Files: `https://xray.games/assets/index-BQ2unOWg.js` (2.6 MB, Vite build) plus the lazy chunk `index-DV3inTWK.js`, which is the WalletConnect modal. I ran the bundle through prettier and read it end to end. Class names below are minified (`xh`, `IF`, `so`, and so on), so I describe each one by its role. The line numbers point into the prettified bundle.
- I also read the contracts to understand the session, target and "opponent" model.
- I did not rely on screenshots or the README.

## Tech stack

| Layer | Choice |
|---|---|
| UI shell | **Lit** web components with no framework router: `header-element`, `body-element`, `footer-element`, `dialog-element`, `game-slider`, `leaderboard-element` |
| Game rendering | **One full-viewport `<canvas id="canvas">` with raw Canvas2D**. It uses an OffscreenCanvas plus `bitmaprenderer` when available, otherwise a double buffer. There is no WebGL and no engine. |
| Game loop | A single `requestAnimationFrame` loop. `dt` is clamped to 50 ms. `update(dt)` runs, then `render(dt)` (class `qF.run`, ~L153870). |
| Physics / sim | Hand-written deterministic 2D math. Snooker uses integer ×1000 fixed-point collision checks copied from the contract. The Slicer does polygon cutting. The Runner is a vertical platformer. |
| Chain | Stellar mainnet Soroban. `@stellar/stellar-sdk` with RPC `https://api.xray.games/rpc/`, user-overridable in settings. |
| Wallets | Stellar Wallets Kit (Freighter, Albedo, xBull, Lobstr, Hana, Rabet, Klever, HOT, Ledger, WalletConnect). Alternatively the **Ohloss smart wallet**: a popup to `ohloss.com/signer` using postMessage and passkey-style auth-entry signing. |
| Backend | `api.xray.games`. Endpoints: `/slicer/start`, `/runner/start` (serve attested levels), `/{game}/prove` (server-side proving), `/job/status/:player`, `/session/time/:player/:game`, `/forfeit`, `/leaderboard`, `/ohloss/{prepare,sign}`. |
| ZK | Circom (Groth16 over BN254, verified fully on-chain) and Noir (UltraHonk; attestation plus admin auth only, because Soroban has no Noir verifier). The user toggles between them in settings (`localStorage.noir`). |
| PWA | `manifest.json` (standalone, portrait) and a no-op `sw.js` (skipWaiting/claim) so the app is installable. |
| Fonts | Inter (UI), IBM Plex Sans/Mono, Orbitron (hero/sci-fi). |

## The key trick: the live game behind the menu

The part you liked is simple, and it is the most reusable idea in the codebase.

1. **There is only one canvas, and it is always rendering.**
   - `index.html` has `<canvas id="canvas">` as a sibling of `.app`.
   - The CSS is `canvas { position: fixed; top:0; left:0; pointer-events:none }`.
   - At boot, `wn.setCanvasMode(true)` locks body scroll, sets `touch-action:none` and turns canvas `pointer-events:auto`.
   - The rAF loop never stops. The menu, the match and the results screens all draw over the same running canvas.
2. **The DOM UI is a transparent overlay.** `body-element` is `position:fixed; inset:0; pointer-events:none; z-index:10`.
   - Each screen renders an `.overlay` with `pointer-events:auto` and a `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,.4) 100%)` vignette. The game stays visible through the middle of the screen.
   - Menu cards use `backdrop-filter: blur(5–6px)` glass, so the arena behind them reads as depth.
   - During a match, the overlay is only a HUD `div`, so input falls through to the canvas.
3. **Each "game" object has an attract mode as well as a play mode, in the same class.** All games extend a base `xh` class (L142452).
   - **Menu state (`session == null`):**
     - The game loads a random sample level. For example, Slicer picks a random level from the built-in `Vl` list in its constructor. Snooker shows its idle table.
     - The scene slowly rotates: `scene.angle += π·0.02·dt`, one revolution about every 100 s.
     - The camera is zoomed out by `onZoomUpdate(z) → z*1.2` (Slicer) or `*1.3` (Snooker). This framing is what makes it feel like you are floating around the arena.
   - **Start (`session` set):**
     - The same object keeps running.
     - The rotation direction flips to `±2π·dt` so the board unwinds quickly back to angle 0 (the value snaps to 0 below 0.2π).
     - Zoom eases to 1.0.
     - The primary camera lerps its translation (speed factor 3·20·dt), and the secondary camera zoom steps at 35 units/s toward the target (`xh.updateCameras`, L142540).
   - **Result:** pressing Practice or Play gives a **"fly into the board"** transition with no screen change, no loading scene and no route change.
4. **The carousel drives the canvas.**
   - The slide list is `Fv.list()`: `WELCOME` (class `Default`), Chain Slicer, Chain Snooker, Chain Runner.
   - When `game-slider` fires `game-selected`, `body-element._onGameSelected` calls `wn.canvas().setGame(index)`.
   - `setGame` runs a **400 ms crossfade through a dark scrim**:
     - Phase "out": over 200 ms, alpha goes 0→1 on `rgba(13,13,20,α)` with easeInOutCubic.
     - At the midpoint it swaps the active game object and recalculates layout.
     - Phase "in": over 200 ms, alpha goes 1→0 (`IF.setGame` / `bA` / `vA`, L148640–148760).
   - All game objects are constructed up front and share one sprite sheet (`/sprites.png`). Switching therefore needs no loading.
5. **The Welcome slide has its own ambient scene.** Class `gA` "Default" (L148199) is pure procedural background:
   - A pulsing hex grid.
   - Six dashed "data stream" lines falling.
   - Forty drifting parallax particles, with 30% of them "glow" radial gradients.
   - Three tilted elliptical orbital rings with glowing dots.
   - A pulsing center reticle with corner brackets.
   - The whole scene rotating slowly.
   - Every colour comes from the CSS custom properties `--neon-primary(-rgb)` and `--neon-accent(-rgb)`, read with `getComputedStyle` and cached. **Changing the theme recolours the canvas instantly.**
6. **Every game has a grid.** `xh.renderGrid` draws a world-space grid with alpha `0.35 + 0.15·sin(t·0.5)`, sized to cover the viewport around the scene centre. That is why the empty space still looks "alive".

**Takeaway for our arena:** build one persistent renderer. Give each mode an `idle/attract` state (AI or bots playing, a slow orbit camera, zoomed out) and a `play` state (camera dolly to gameplay framing). Put the DOM menus on top with a vignette and glass. When the player starts, keep the scene and animate only the camera.

## Screen-by-screen flow (traced in source)

Scene stages are the enum `li = { Menu, Playing, Prove, Score }`. Games emit them via `window.dispatchEvent(new CustomEvent('scene-changed', {detail:{sceneStage,data}}))`. `body-element` renders purely from that state (`render()`, ~L152600). The priority order is: busy → error → win celebration → forfeit-closing → wager → prove → playing (HUD) → score → menu.

### 0. Boot

`window._SG.App = new qF()`:
- `setCanvasMode(true)`.
- Apply the saved theme class (`theme-matrix`, `-synthwave`, `-cyberpunk`, `-retro`, `-vapor`, or random if `random-theme` is set).
- Construct every game.
- Load `sprites.png`.
- `recalcLayout()`.
- Start rAF.
- Register the service worker.

Nothing waits on the network or a wallet. `header-element` quietly tries `_restoreWallet()`, which reads the saved address or smart wallet from localStorage.

### 1. Landing / Welcome (slide 0)

- Top: the SVG logo (inline, tinted with CSS vars) and "Trustless gaming on Stellar" with the Stellar logo.
- Centre: the **carousel** (`game-slider`). Slide 0 is the hero:
  - "THE ARCADE EVOLVED" (Orbitron, `heroGlow` 3 s pulse).
  - "Your skills. Proven onchain."
  - One CTA, **ENTER ARCADE**.
  - GitHub and Blog links.
- Neighbouring slides peek in at the sides: desktop `translateX(±85%) scale(.88) opacity .65`; mobile `±95%`, `scale(.9)`, `opacity .4`.
- Corner: a **LEADERBOARDS** button. Bottom: Privacy and Terms (opened in `dialog-element` from `/privacy.txt` and `/terms.txt`).
- Background: the "Default" procedural scene.

### 2. Arcade menu (slides 1..3)

- ENTER ARCADE simply advances the carousel (`_goToNext`) and sets `isWelcomeScreen=false`.
- Each game card shows the title, subtitle ("geometry puzzle game verified by ZK proofs" and so on) and two buttons: **PLAY** (primary) and **PRACTICE** (secondary).
- Only the centre card's buttons work; side cards act as "click to focus".
- Carousel details:
  - Infinite wrap.
  - Mouse and touch drag with an 80 px swipe threshold, plus 5 px of movement before a click counts as a drag.
  - Prev/next chevrons and dots.
  - Transition `0.55s cubic-bezier(0.4,0,0.15,1)` on transform, opacity and filter. Drag disables the transition.
  - A 600 ms animation lock.
  - Auto-advance exists but is a no-op (`_startAutoAdvance` only clears).
- **Every slide change swaps the live game behind the menu**, using the 400 ms scrim crossfade described above. You see the actual game you are about to play, slowly rotating, before you press anything.

### 3. Practice (zero friction)

The path is `PRACTICE` → `_onGamePractice` → `_startGame(Oi.Local, 0)` → `so.start(Local)`.

- **No wallet, no signature, no account, no transaction.** In `so.start`, when `mode === Local`:
  - It calls `game.getData()` with no chain value.
  - That function generates a local session:
    - **Slicer:** random seed, fixed target 232.
    - **Runner:** random u32 seed, target 6–14.
    - **Snooker:** five random ball/pocket pairs, target taken from the streak table.
  - It then dispatches `start-game` straight away.
- The overlay shows "PREPARING GAME / Please wait..." for one tick.
- Slicer and Runner still fetch **attested levels from the API** by seed (`/slicer/start?seed=&index=`). Practice uses the same server level generator as real play; only the chain step is skipped.
- On game end, `score >= target && mode !== Local` decides between `Prove` and `Score`. Practice **always goes to `Score`**:
  - No proof.
  - No forfeit call.
  - No time sync. `fetchTimeRemaining` returns null for Local, so the local timer runs: Snooker 120 s, and the Slicer/Runner constants.
- The result panel shows "YOU WIN!" or "YOU LOSE", with SCORE vs TARGET, and a **MENU** button.
- The canvas simply returns to attract mode.
- **Friction count:** one click from the arcade card to gameplay, and two from a cold landing (ENTER ARCADE, then PRACTICE).

### 4. Play (ranked / wagered), which stands in for "matchmaking"

The path is `PLAY` → `_openWager()`.

1. Dispatch `ensure-wallet`. `header-element` opens the wallet modal (Stellar Wallets Kit, or the Ohloss popup if the Ohloss toggle is on) and replies with `wallet-ready`.
2. **Without Ohloss:** `_startGame(Wallet, 0)`, a free ranked run.
3. **With Ohloss:** a **wager panel** appears ("OHLOSS WAGER", digits-only FP input, START; an empty input shakes). A side panel shows your faction symbol and name plus available FP, calculated on the client from the Ohloss contract storage and vault balance (`tl.load`).
4. `so.start(mode, wager)`:
   - Generate a 32-byte random **preimage** on the client.
   - `commitment = SHA-256(preimage)`.
   - Build a Soroban `start(player, commitment, wager_i128, ...params)` call and simulate or prepare it.
   - Sign it:
     - With a wallet: the wallet signs the transaction.
     - With Ohloss: the smart wallet signs only the auth entry, with an expiry of ledger + 17280. Then the server's `/ohloss/prepare` and `/ohloss/sign` endpoints fee-bump or co-sign using the house account `GDMS…GAME`.
   - Submit and poll `getTransaction` (up to 30 s).
   - Read the returned session: seed, target, and for Snooker the ball and pocket arrays.
   - Persist `{seed, preimage}` in `localStorage.session`, so a reload during the match can still settle.
   - The busy overlay reads "PREPARING GAME / Connecting to contract".
5. **There is no real matchmaking. It is asynchronous "beat the target".** On-chain (`contracts/*/src/*.rs` `start`):
   - `roll_target` keeps a rolling pool of the last 10 **winning scores from other players** (expiring after 24 h) and tops it up with synthetic random scores.
   - It picks one at random as your target. **Your "opponent" is effectively a recent winner's score.**
   - With Ohloss, the contract also picks an opposing *faction house account* (from `SHA-256(commitment)`), which must `require_auth`, and calls `ohloss.start_game(player vs house)`.
   - The README says this directly: "asynchronous matchmaking, removing the need for scheduling coordination".
   - **Reconnect is built in.** Calling `start` again while a session is alive returns the same session.
6. The time limit is synced from the server: `/session/time/:player/:game` sets `timeRemaining = min(server, local)`.

### 5. Match

- `sceneStage = Playing`. `body-element` renders only `<div class="hud">${game.renderHud()}</div>` and starts a 1 Hz HUD refresh timer.
- The HUD is DOM, not canvas: a timer that goes amber at 30 s and red at 10 s, score, level, and so on. It is anchored bottom-left above the footer.
- Input comes through canvas pointer events: `pointerdown/move/up` with pointer capture, converted to scene space via the camera matrices. The Runner also takes keyboard input.
- Snooker is one-touch aim-and-release. Slicer is drag-to-cut. Runner is hold/tap.
- Between levels (Slicer), `animationDelay` gives 1.5 s during which `onZoomUpdate` pulses the zoom (×0.95, then ×3 punch-in, then ×0.98). This produces a camera "breath" on success.

### 6. Results / Prove

- **Lost, or practice:** the `Score` panel shows YOU LOSE or YOU WIN!, SCORE, TARGET and MENU.
  - If it was a real session and you lost, the client posts `/forfeit {player, game, preimage}`. The server then calls `end(preimage, empty proof)`, which counts as a forfeit and settles Ohloss as a loss.
  - Pressing MENU while a forfeit is still settling shows "CLOSING SESSION / Waiting for contract..." and polls `/job/status` every 5 s.
- **Won a real session:** the `Prove` panel shows the result, "Your proof is ready for onchain verification.", **SUBMIT PROOF**, and a link labelled "🔧 Run your own prover? Download proof input".
  - The link downloads a witness JSON: `slicer-witness.json`, `runner-witness.json` or `snooker-witness.json`.
  - SUBMIT POSTs `/{game}/prove` with `{player, seed, provers[], preimage, score}`.
  - The overlay reads "VERIFYING ONCHAIN / This may take a moment...", then polls `/job/status/:player` every 5 s.
  - When the job is done, a **fireworks celebration** runs for 2.5 s: 20 CSS fireworks with random delay and position in theme colours, plus "SKILL VERIFIED / Proof recorded onchain".
  - It then drops back to the menu.

## Identity, guest mode, leaderboards and auth

- **There is no guest account and no login.** Identity is simply the Stellar address, or the Ohloss smart-wallet address. Practice needs no identity at all and writes nothing.
- **Persistence is all localStorage:**
  - `wallet`: last address, restored silently on boot.
  - `smartwallet`
  - `theme`, `random-theme`
  - `noir` (prover backend)
  - `ohloss` (mode toggle)
  - `rpc` (custom endpoint)
  - `session`: `{s: seed, p: preimage}` for crash recovery.
  - `@StellarWalletsKit/usedWalletsIds`
- **Leaderboard** (`leaderboard-element`):
  - `GET api.xray.games/leaderboard?game=&sort=wins|wager`.
  - A game filter dropdown: All, Snooker, Slicer, Runner.
  - A "by wins" / "by FP" toggle.
  - Rows show rank (top 3 styled), a truncated address linking to stellar.expert, wins or total wager, and best score.
  - Switching filters uses a 150 ms fade-out/in.
  - It is computed server-side, presumably by indexing contract `end` results.
  - Practice scores never appear, so the leaderboard stays trustworthy.
- **Settings (header):**
  - Theme picker with five palettes plus Random.
  - Noir/Circom prover toggle.
  - Ohloss toggle, which switches wallet mode and disconnects the current wallet.
  - Custom RPC field.
  - Wallet connect/disconnect.

## How ZK and deterministic simulation are used

- **Seed:** `SeedGenerator.generate(player, nonce) = Poseidon2(sha256(addrXDR)[0..31], nonce)` over BN254 (`contracts/common/src/zk.rs`). It is created in `start` with `env.prng()`, which prevents grinding.
- **Levels:** the server generates the level from the seed and signs an **ed25519 attestation**. The layout is `[ver:1][seed:32][index:4][hash_noir:32][hash_circom:32][ts:8][pad:2]` followed by the signature. The contract checks the attestation against the stored attestor key and requires `attestation.seed == session.seed`.
- **Proof:**
  - The Slicer and Runner circuits re-run the game's geometry and physics over the player's inputs. They output the level hash plus stats (polygons, objects, partitions).
  - The contract verifies Groth16 on-chain with BN254 pairings (`verify_groth16`), recomputes the score (`polygons·30 + objects·8 + max(0,partitions−objects)·15`) and compares it with the target.
  - A "hint-based" circuit brings verification from O(n²) down to O(n), and the compiled circuit from about 100 MB to about 4 MB.
- **Snooker needs no ZK.** The contract re-simulates the shots itself with integer fixed-point math (`Pool::is_potted`), and the client uses **the same fixed-point function** (`contractValidatePot`, BigInt `<<36`) so the result it shows always matches the contract. **This is the pattern to copy: identical deterministic sim code on the client and the verifier.**
- **Commit/reveal:** `commitment = sha256(preimage)` is stored at `start`. `end` requires the preimage, and a correct preimage with empty proof counts as a forfeit. This lets the server settle or forfeit for you without holding your keys, while you can still self-submit.
- **Trust model:** the server is a convenience (proving, fee sponsorship, forfeits), not a trust assumption. You can download the witness, prove locally and call `end` yourself.

## Motion / transitions inventory

| Where | Motion |
|---|---|
| Game switch | 400 ms scrim crossfade `rgba(13,13,20)` with easeInOutCubic (canvas) |
| Menu → play | Scene rotation unwinds at 2π/s to 0; zoom 1.2–1.3 → 1.0; camera lerp |
| Idle | Scene orbit 0.02π rad/s; grid alpha breathing; particles, orbitals, reticle pulses |
| Carousel | 0.55 s `cubic-bezier(.4,0,.15,1)` on translate, scale, opacity and filter; drag follows the finger via `--drag-offset` |
| Buttons | 0.25 s, `translateY(-2px)` on hover, `scale(.97)` on active, a "shine" sweep element, `backdrop-filter: blur(4px)` |
| Level clear | Zoom punch (×3, then settle) during a 1.5 s delay |
| Win | Fireworks overlay for 2.5 s |
| Leaderboard | 150 ms list fade on filter change |
| Global | `* { transition: background-color/border-color/box-shadow .3s }` so theme swaps animate |

## What to take, what to leave

**Take:**
- A persistent canvas under a transparent DOM overlay.
- An attract/idle state inside the same game object.
- Camera-only transitions into play.
- One-click practice with a locally generated seed that skips chain and wallet but uses the same sim and levels.
- Async "beat a recent winner's score" as an alternative to live matchmaking.
- Commit/reveal session plus a server-assisted settle, with a self-submit escape hatch.
- The same deterministic fixed-point sim on client and verifier.
- A reconnect-safe session (re-calling `start` returns the live session).

**Leave (the visual design you dislike):**
- Five neon palettes on near-black.
- Orbitron headings with glow pulses.
- Hex grid, orbitals and "data stream" sci-fi ornament.
- Glassmorphism cards.
- An inline SVG wordmark in magenta/lime.
- A generic "cyber arcade" look overall.

The mechanics above do not depend on any of these.
