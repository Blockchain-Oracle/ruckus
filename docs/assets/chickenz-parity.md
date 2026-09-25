# Chickenz fidelity parity ledger

This ledger compares the reference game with our port, one capability per row. It is the checklist for S07 to S11. When a row is done, change its **Target status** and cite the target file.

## 1. Authority record

| Item | Value |
|---|---|
| Reference | `references/chickenz` (AshFrancis/chickenz, MIT), commit **874e8cb** |
| Reference client | `apps/client/src/**`, `apps/client/index.html` (1,943 lines of inline CSS, HTML overlays and a hydrate script), `apps/client/public/{sprites,audio}` |
| Reference server (rules only) | `services/server/src/GameRoom.ts`, `BotLobbyManager.ts`, `packages/sim/src/constants.ts` |
| Target | `apps/web/src/games/chickenz/**` (R3F renderer), `crates/chickenz-sim` (Rust/wasm sim, ADR-005), hub shell in `apps/web/src/app` and `apps/web/src/engine` |
| Summary doc | `docs/research/deep/chickenz.md`. **If it disagrees with the code, the code wins.** |
| Authority order | 1. reference code (`*.ts`) → 2. `index.html` markup and CSS → 3. docs |
| Baseline rule | The reference is the **minimum**. The port may add to it but must not drop anything, unless the row is classified Blocked or Adapted below. |

**Allowed deviations. Nothing else may differ.**
1. **Brand and shell:** the RUCKUS name and the hub shell (camera dolly, cabinet tiles, scrim) replace the Chickenz lobby chrome, top bar, logo and gate.
2. **4-player FFA instead of 1v1:** ADR-005. Rules that were written for 2 players (camera framing, round wins, colours, round clock) are generalised to N ≤ 4. 1v1 is N = 2.
3. **No Stellar, wallet, passkey, ZK or Boundless.** Ranked mode, settlement, proof badges and match-detail proof grids are dropped. Money exists only in the casino wager.
4. **No dishonest bots:**
   - No fake lobby rooms (`BotLobbyManager.ts:14-16`).
   - No disguised auto-joined bots (`BotLobbyManager.ts:30,104-110`: a bot joins after 5 s).
   - No mercy rounds or rubber-banding (`GameRoom.ts:473-486`).
   - Bots are always labelled.
5. **Assets that must be re-sourced for licensing reasons** (ADR-006):
   - The gun sprites `gun-*.png`.
   - `logo.png`.
   - All music `bgm-1..5.mp3` (NCS tracks, which don't allow gambling use).
   - The taunt clips `frog-croak/ooga/wub/pop.mp3` (origin unknown; the Clipchamp metadata doesn't settle it).

   Pixel Adventure art (heroes, terrain, backgrounds, dust, collected) is CC0 and may be reused as is.
6. **The casino wager ("Back a Bird") is additive.** It never changes skill play.

**Classification key**

| Class | Meaning |
|---|---|
| Exact | Reproduce the reference behaviour and numbers 1:1 |
| Adapted | Same intent, changed for FFA, the R3F renderer or brand rules. Record why in Notes |
| Additive | Not in the reference. Allowed on top of the baseline |
| Blocked | Deliberately not ported, under one of the allowed deviations above |

**Target status key:** have / partial / missing. Every "partial" row lists the gap in Notes.

---

## 2. Parity ledger

### 2.1 Input

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Default key bindings | `input/InputManager.ts:15-21` | Left `KeyA`/`ArrowLeft`; Right `KeyD`/`ArrowRight`; Jump `KeyW`/`ArrowUp`; Shoot `Space`/`Mouse0`; Taunt `KeyS`/`ArrowDown`. Two slots per action | missing | Exact | Nothing reads the keyboard. The sim takes it through `Sim.set_input(slot, buttons, aim_x, aim_y)` (`crates/chickenz-sim/src/wasm.rs:45`) |
| Aim derivation | `InputManager.ts:136-142` | `aimX` = −1 if Left is held, +1 if Right, 0 otherwise. `aimY` is always 0. When touch aim is non-zero it overrides the keyboard | missing | Exact | Aim is horizontal only. There is no mouse aim |
| Mouse buttons | `InputManager.ts:61-67` | `mousedown`/`mouseup` on the canvas set `Mouse{button}`. The context menu is suppressed on the canvas | missing | Exact | Mouse0 (LMB) is the second Shoot binding |
| Blur clears keys | `InputManager.ts:68-70` | `window.blur` clears every held key, so nothing gets stuck on alt-tab | missing | Exact | |
| Held keys and edges | `InputManager.ts:118-143`; sim | Keys are level-sampled every tick. The sim needs a rising edge to jump again (hence the touch pulse below) | missing | Exact | Rust adds `JUMP_BUFFER_T = 6` (`constants.rs:26`), a jump buffer. That is **Additive** |
| Rebinding | `ui/SettingsPanel.ts:201-305`; `index.html:1715-1751` | Click a key button: it shows `...` and gets the `listening` class. The next key or mouse button (capture phase) binds. Modifier-only keys are ignored. A duplicate binding elsewhere is cleared. "Reset Defaults" restores the table. Saved to `localStorage["chickenz-bindings"]` with old-format migration (`InputManager.ts:145-178`) | missing | Exact | Needs a Controls section in `ui/SettingsSheet.tsx`. Key labels come from `friendlyKeyName` (`InputManager.ts:26-39`): `MOUSE1`, `SPACE`, `LEFT`… |
| Typing guard | `main.ts:734-740`; `SettingsPanel.ts:195-199` | Text inputs `stopPropagation` on keydown and keyup, so typing doesn't move the bird | missing | Exact | Apply to every hub text field while a match runs |
| Touch: joystick | `input/TouchControls.ts:17-19,72-82,193-216`; `index.html:1670-1671` | A fixed-base joystick on a canvas covering the left 55% of the width and the bottom 55% of the height. The base is 110 px from the left and 110 px from the bottom. Radius 65, knob radius 28, dead zone 0.18. `nx > 0.3` → Right, `nx < −0.3` → Left | missing | Exact | Show only on touch devices (`"ontouchstart" in window \|\| maxTouchPoints > 0`, `main.ts:42-43`) and only while playing |
| Touch: jump by pushing up, with auto-jump pulse | `TouchControls.ts:133-141` | Pushing up (`ny < −0.2`) holds Jump for 47 frames, releases it for 3, and repeats every 50 frames. This produces rising edges while the stick is held up | missing | Exact | Counted in rAF frames. A diagonal-up gives move + jump |
| Touch: tap to taunt | `TouchControls.ts:218-233` | Knob travel under `65 × 0.18 × 1.5 ≈ 17.6 px` and a release under 250 ms sends Taunt for 150 ms | missing | Exact | |
| Touch: spin to escape a stomp | `TouchControls.ts:111-130` | When `norm > 0.35`, track the angle delta and smooth it with an EMA (`0.7·old + 0.3·|Δ|`). Above 0.12 rad/frame, enter shake mode for 25 frames. Shake mode alternates Left and Right every 3 frames (about 10 switches/s). Below 0.35 the speed decays by ×0.85 | missing | Exact | This is how mobile players escape a stomp. The sim rewards alternating L/R presses (`STOMP_SHAKE_PER_PRESS = 17`, threshold 100) |
| Touch: joystick visuals | `TouchControls.ts:281-348` | Base ring `rgba(255,255,255,.06)` fill with a `.18` stroke, 2.5 px wide. In shake mode the ring turns orange (`rgba(255,150,0,.12)` fill, `rgba(255,180,0,.8)` stroke, 3.5 px). Dead-zone ring at `r·0.36`. An active-direction arc spans ±0.55 rad at `r−8`, yellow `rgba(255,255,100,.35)`, 8 px wide. Knob: `.28` fill and `.6` stroke when active, `.12`/`.28` at rest | missing | Exact | Draw on a 2D canvas scaled for DPR (`TouchControls.ts:72-82`) |
| Touch: shoot button | `index.html:1672`; `TouchControls.ts:248-279` | A 90 px circle, 36 px from the bottom-right corner. Fill `rgba(255,50,50,.25)`, 3 px border `rgba(255,50,50,.55)`, 💥 glyph at 28 px. Pressed: fill `.65`, border `rgba(255,120,120,.95)`, `scale(.93)`. Uses multi-touch IDs | missing | Adapted | Replace the emoji glyph with a pixel icon (the "no AI slop" judging criterion). Keep the size, position and colours |
| Touch: aim | `TouchControls.ts:153-158` | Aim is the sign of the knob's x offset outside the dead zone | missing | Exact | |
| Touch: layout shifts | `index.html:647,1569-1570` | On touch, the weapon HUD moves to `bottom: 100px`, the controls hint is hidden, and "PLAY VS BOT" is hidden | missing | Adapted | In our port, play vs bots must stay available on touch. The reference hides it, but that is a gap, not a feature |
| Page-level touch guards | `index.html:5,42` | `maximum-scale=1, user-scalable=no`, `touch-action: manipulation` | partial | Exact | Check the hub meta tag in `apps/web/index.html` |

### 2.2 Match and round flow

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Round rules | `packages/sim/src/constants.ts:31-40`; `GameRoom.ts:29-35` | 1 life per round, 100 HP, a 30 s round (1,800 ticks), sudden death at 20 s (tick 1,200). Death linger 30 ticks, respawn 60, invincibility 60 | partial | Adapted | Rust: the round clock grows with player count (30/35/40 s for 2/3/4 players), and sudden death always takes the last 10 s (`constants.rs:36-37`). 1 life and 30-tick linger are the same |
| Best-of | `GameRoom.ts:31-34,694-703` | Casual: best of 5, first to 3 wins. Ranked: best of 3, first to 2. Safety cap `currentRound ≥ totalRounds + 2`. Tie goes to P0 (`roundWins[0] ≥ roundWins[1]`) | missing | Adapted | Drop ranked. Use first to 3 in FFA, with a symmetric tie-break (ADR-005: no creator-wins). The attract loop only runs single rounds (`sim/driver.ts:106-117`) |
| Server countdown | `GameRoom.ts:12,526` | `COUNTDOWN_TICKS = 90` (1.5 s): the sim doesn't step and inputs are ignored | missing | Exact | For a local match, freeze the sim while the countdown shows |
| Countdown 3-2-1-GO | `GameScene.ts:810-829` | Shows "3", then "2" at +350 ms, "1" at +700 ms, "GO!" at +1050 ms. At GO, `onComplete` fires (play enabled, ROUND popup, `match-start` SFX). The overlay hides at GO + 400 ms | missing | Exact | **Quirk:** `onComplete` immediately calls `showAnnounce("ROUND N")`, which overwrites "GO!" in the same frame, so GO! is never actually seen. The overlay then hides at +400 ms (`GameScene.ts:818-822`, `803-808`). Port the timing, but show GO! for real (Additive fix), then show ROUND N |
| ROUND N popup | `GameScene.ts:803-808,772,797` | `ROUND ${n}` in the announce overlay, hidden after 500 ms | missing | Exact | |
| Frozen input during countdown | `GameScene.ts:757,784,2035-2037` | `playing = false`, so there is no prediction or input, and every bird is forced into the idle animation | missing | Exact | |
| Round-end banner | `GameScene.ts:916-921`; `GameRoom.ts:600-619` | At `matchOver` (after the 30-tick linger) the server sends `round_end`. The client shows `Round ${r+1} - ${NAME} wins!\n${w0} - ${w1}` (the CSS uppercases it). Players **can keep moving** while it's up (the "taunt window") | missing | Adapted | FFA: `ROUND n - NAME WINS!` plus a score line of per-player pips instead of `w0 - w1`. Use "DRAW!" when nobody survives |
| Round linger | `GameRoom.ts:621-628,35` | State keeps broadcasting for 60 ticks (1 s) after `round_end`, then `endRound`. After another 750 ms, `round_start` | missing | Exact | Totals about 0.5 + 1 + 0.75 s before the wipe starts |
| Round transition | `GameScene.ts:781-801` | Diamond wipe → at the midpoint, load the next map and seed → countdown → play | missing | Exact | Maps rotate through `mapOrder` (`GameRoom.ts:707`) |
| Diamond wipe | `GameScene.ts:832-913`; `index.html:895-939,1795-1799` | A 5×3 grid of `50vmax` squares rotated 45°, colour `#111122`. Grow: `scale 0→1` over 180 ms, `cubic-bezier(.4,0,.2,1)`, each column delayed a further 60 ms. Midpoint callback at 420 + 30 ms. Hold 250 ms. Shrink with the same wave. Cleanup at 420 + 50 ms. Total ≈ 1.17 s. z-index 190 | missing | Exact | The Art Bible (`ART-BIBLE.md:56`) already names "diamond wipes, from Chickenz". The hub currently uses a crossfade scrim (`engine/scrim.ts`); the wipe replaces it inside Chickenz |
| Match-end banner | `GameScene.ts:1191-1208` | `${NAME} wins!`, or `Player N wins!`, or `DRAW!`. Plays the `match-end` SFX. Sudden-death overlay hidden. Explosions and ragdolls cleared | missing | Exact | |
| Return after the match | `net/ServerConnector.ts:128-149` | 2,500 ms after match end: diamond wipe → lobby | missing | Adapted | In our port, go to the results screen (phase `results`, `engine/gameMachine.ts:14-20`), then back to the hub |
| Warmup room | `GameScene.ts:538-606,617-625,1385-1409`; `index.html:657-693,1626-1637` | While waiting for an opponent you can play alone: the ARENA map, 99 lives, no clock, no sudden death, P2 teleported to (−9999, −9999). The camera follows you at zoom 1.3. The DOM shows "WAITING FOR OPPONENT...", a JOIN CODE (24 px `#ffee58`, letter-spacing 6, shadow `#c9a800`), and buttons "← LOBBY", "PLAY VS BOT", "COPY LINK" (shows "COPIED!" for 1.5 s) | missing | Adapted | Needed for S08 online rooms. With 4-player rooms, show the filled slots |
| Play vs bot | `main.ts:505-507`; `GameRoom.ts:191-203`; `ServerConnector.ts:66-67` | "PLAY VS BOT" adds a server bot (difficulty 0.3). The button is hidden in ranked mode and on touch | missing | Adapted | **Top priority slice.** Run it locally: one human plus 1-3 labelled Rust bots (`sim.set_bot`, `wasm.rs:33`), with no server |
| Fake lobbies, disguised bots, mercy | `BotLobbyManager.ts:14-16,30,104-110`; `GameRoom.ts:473-486` | Fake "waiting" rooms. A bot joins a casual room after 5 s. Bot difficulty drops 0.15 when the bot leads, rises 0.05 when the human leads, and a mercy round reduces it further | missing | Blocked | Deviation 4 |
| Quick Play, create or join room | `main.ts:656-739`; `index.html:1851-1870` | Quick Play; Create Public or Private; join by 5-letter code; `?join=CODE` deep link (`main.ts:785-824`) | partial | Adapted | The hub shell and S05 lobby own this. Chickenz must accept being started from a room |
| Casual/Ranked toggle | `main.ts:411-438` | Ranked needs a wallet | missing | Blocked | Deviation 3 |
| Tournament and spectate | `ServerConnector.ts:177-339`; `ui/TournamentPanel.ts` | Bracket, a VS card (0.8 s zoom, then the VS overlay at 1.6 s, then the match at 2.8 s), a spectate overlay, and standings for 8 s | missing | Adapted | Stage S27 |
| Replays | `GameScene.ts:1019-1173,1412-1477,2289-2293` | Deterministic re-sim from the input transcript. Space pauses, Up/Down sets speed ×2 or ÷2 (0.5 to 8×), Esc exits. Info bar: `REPLAY PLAYING 1x \| Space: Pause \| Up/Down: Speed \| Esc: Exit` (10 px `#ffee58`). Multi-round replays wait 2,000 ms between rounds; after the final banner, a 2,500 ms wipe then exit | missing | Adapted | Convex holds replays (CLAUDE.md layout). The sim is already deterministic |

### 2.3 HUD and overlays

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Announce overlay | `constants.ts:124-135`; `index.html:573-597,1606-1608` | Centred DOM text, 32 px bold `#ffee58`, uppercase, letter-spacing 2 px, `text-shadow: 2px 2px 0 #c9a800, 4px 4px 0 rgba(0,0,0,.5)`, line-height 1.6, `white-space: pre-line`, z-index 50 | missing | Exact | Silkscreen is the Art Bible's font for the Chickenz HUD (`ART-BIBLE.md:35`). `#ffee58` is not the reserved money gold `#FFC23A`, so it may stay |
| Round timer | `GameScene.ts:282-291,2235-2238` | Top-right at (VIEW_W − 20, 10), 16 px white Silkscreen, right-aligned, `${ceil(ticksLeft/60)}s` | missing | Exact | Hidden in warmup and tutorial (`GameScene.ts:2226-2233`) |
| Round/score text | `GameScene.ts:351-360,2263-2271` | Top-left at (10, 10), 10 px white with a 2 px black stroke: `R${round}/${total}  ${w0}-${w1}` | missing | Adapted | FFA: `R2/5` plus per-hero round pips with portraits. S09 acceptance asks for "portraits, HP, round pips" |
| Sudden-death text | `GameScene.ts:2240-2261`; `index.html:599-618` | A DOM element 50 px from the top, centred, `#ff4444`, uppercase, with a 4-way black text shadow. During the 180 ticks before sudden death: `SUDDEN DEATH IN ${ceil(t/60)}` at 20 px. After: `SUDDEN DEATH` at 16 px. Shown only while playing | missing | Exact | The CSS asks for 'Press Start 2P', which is never loaded, so it falls back to Courier New. Use Silkscreen (Adapted). A second Phaser SD text (`GameScene.ts:292-304`) is created but never shown |
| Weapon and ammo HUD | `GameScene.ts:2273-2285`; `index.html:620-636,647` | Bottom-centre, 16 px up (100 px on touch), 12 px white Silkscreen with a black shadow: `PISTOL 15` / `SHOTGUN 6` / `SNIPER 3` / `ROCKET 4` / `SMG 40` for the local bird. Hidden when unarmed | missing | Exact | The view already exposes `P.weapon` and `P.ammo` |
| HP bar above each bird | `GameScene.ts:2175-2183` | 24 × 4 px bar at drawY − 3, with a 1 px black frame (26 × 6) over `#333333`. Fill `#66bb6a` above 50%, `#ffa726` above 25%, otherwise `#ef5350` | missing | Exact | Draw it in world space so it moves with the bird. A stomped victim's bar draws above the rider (`GameScene.ts:2172-2173`) |
| Name above each bird | `GameScene.ts:317-330,2211-2221` | 10 px white Silkscreen with a 1 px black shadow, origin (0.5, 1), at drawY − 6. Hidden when the username is empty | missing | Adapted | FFA: guest names and bot labels ("BOT · Mask Dude") so bots are never disguised |
| "SHAKE HIM OFF!" alert | `GameScene.ts:333-348,2197-2209` | 7 px white with a 2 px black stroke, below the stomped bird. Alpha pulses `sin(tick·0.2)·0.3 + 0.7` | missing | Exact | FFA wording could be "SHAKE 'EM OFF!", but keep the original |
| Shake-off progress bar | `GameScene.ts:2185-2196` | 24 × 3 px `#ffee58` fill over `#444444` with a black frame, at drawY + 32 + 2, while `stompShakeProgress > 0` | missing | Exact | View field `P.shakeProgress` |
| Stomp depth layering | `GameScene.ts:1826-1837,2073-2080,2107-2109` | The rider's sprite snaps to (victim.x, victim.y − 32 + 10). The rider is drawn behind the victim (depth 18/19) and the victim on top (22/23) | missing | Exact | Covered by `Bird.tsx` z ordering |
| High-ping warning | `GameScene.ts:1556-1560`; `index.html:621-623,638-655` | When RTT > 180 ms: "High ping detected >180ms — You may experience stutters", 10 px `#ff8800` | missing | Adapted | S08, online only |
| Controls hint | `GameScene.ts:307-314,1310-1312` | 8 px `#888` text at bottom-left | missing | Blocked | Dead code: `setControlsHint` is never called. Don't port |
| Kill feed | none | None | missing | Additive | Useful in 4-player FFA ("Pink Man ✕ Ninja Frog"). Optional, S09 |
| Muzzle flash, hit flash, screen shake, hit-stop | none | None. The reference has no juice here | missing | Additive | S09 acceptance lists them. Render-only, never inside the sim |
| Top bar | `index.html:54-94,1576-1586` | Fullscreen toggle (⛶/✖), music mute icon, settings gear, username in `#ffee58` | partial | Adapted | The hub shell provides settings. Fullscreen and a music toggle are missing |
| Page chrome | `index.html:16-45` | Silkscreen from Google Fonts; body `#0a0a14` with 2 px scanlines (`rgba(0,0,0,.15)`); `border-radius: 0` everywhere; canvas `image-rendering: pixelated` | partial | Adapted | The hub has its own brand. The in-game layer keeps pixel rendering (NearestFilter already, `sprites.ts:52-58`) |
| Tiled pixel card frame | `ui/TiledFrame.ts:1-59` | Settings and prompt cards get a 16 px terrain-tile border | missing | Adapted | For Chickenz-specific cards only (tutorial and results) |

### 2.4 Camera

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Height-locked view | `game.ts:9-25` | Always shows 540 world units vertically; VIEW_W widens on wide screens | have | Exact | `config.ts:13-20` (`PLAY_DISTANCE` is height-locked) |
| Dynamic framing | `scenes/CameraSystem.ts:84-123` | With both alive, `dist = hypot`: zoom 1.3 when `dist < 250`, 1.0 when `dist > 500`, linear between. Centre on the midpoint. Fit guard: `min(VIEW_W/needW, VIEW_H/needH)` with 80 px padding. Smoothing per 60 fps frame: zoom 0.05, position 0.15 (`smoothLerp`, `constants.ts:118-120`) | missing | Adapted | FFA: frame the bounding box of the living birds (ADR-005 "camera-framing data covers every player"), using the same thresholds applied to the box diagonal. The play pose is currently static (`config.ts:19`) |
| Kill cam | `CameraSystem.ts:91-117` | During `roundTransition` or `deathLingerTimer > 0`, zoom to 1.5 on the survivor. If both are dead, zoom 1.5 at (480, 270) | missing | Exact | View field `H.deathLinger` |
| Fixed camera (option off) | `CameraSystem.ts:43-53` | Fit the whole arena with 40 px padding. Zoom smoothing 0.1, position 0.15 | partial | Exact | This is what the play pose does now. It becomes the "Dynamic Camera: off" setting |
| Warmup and tutorial follow cam | `CameraSystem.ts:60-81` | Follow the local bird at zoom 1.3 (zoom 0.05, position 0.15). When dead, return to (480, 270) | missing | Exact | |
| Round-start snap | `GameScene.ts:969-989` | At the round midpoint, snap to the players' midpoint and fit zoom (80 px padding, ≤ 1.0) so there's no swoop | missing | Exact | |
| Pixel snapping | `CameraSystem.ts:20-25` | Round the camera scroll to whole pixels | missing | Adapted | With R3F perspective (30° FOV), snap the camera x/y to 1/16-unit steps in play |
| Attract orbit | none | None | have | Additive | `engine/CameraDirector.tsx` |

### 2.5 World rendering and effects

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Terrain tiles | `scenes/MapBuilder.ts:44-62`; `constants.ts:23-25,97-109` | 16 px tiles. One-tile-high platforms use the thin-platform set (12-14, 0). Taller ones use the grass 9-slice (6-8, 0-2) | have | Exact | `render/terrain.ts` bakes the same frames |
| Pedestals | `MapBuilder.ts:64-83` | Frames 17/18/19, three tiles wide, under each weapon spawn, at `platformTop + 5` | have | Exact | `terrain.ts:32-34` |
| Stone border | `MapBuilder.ts:85-122` | Dark-stone 9-slice, 4 px outset, depth 11 (above the platforms) | have | Exact | `config.ts:30` |
| Background colour and scroll | `MapBuilder.ts:26-40`; `GameScene.ts:1568-1572` | One of 7 backgrounds, picked by a Mulberry-style seed hash, scrolling in a seeded direction at 0.3 px/frame (18 px/s). Clipped to the arena | have | Exact | `render/Arena.tsx:11-39`, `config.ts:26` |
| Out-of-arena colour | `GameScene.ts:410`; `game.ts:32` | Scene background `#211f30` (canvas `#1a1a2e`) | partial | Adapted | Uses `#1b1024` (`Scene.tsx:62`). Check against the Art Bible ink colour |
| Sudden-death zone | `GameScene.ts:1623-1632` | Fill `#ff0000` at alpha 0.5, from 0 to `arenaLeft` and from `arenaRight` to the map width, full height | partial | Adapted | `render/Zone.tsx` uses `#ff5a36` at 0.28, because red is the brand tomato. Consider a pulse and damage ticks (Additive) |
| Projectiles | `scenes/ProjectileRenderer.ts:38-89` | Axis-aligned white rectangles with a 1 px black shadow at 0.6 alpha. Sizes: pistol 3×2, SMG 3×2, shotgun 4×2, sniper 6×2, rocket 6×4. Y is offset to gun height. On the first frame, x snaps to the muzzle | partial | Adapted | `render/Projectiles.tsx`: rotated by velocity, core `#fff1d6`, rockets `#ff5a36`. **Bug:** `BULLET_PX` (`guns.ts:90-96`) is out of order: pistol 4×3, shotgun 3×2, sniper 6×3. Restore the reference sizes. Muzzle snap and gun-height offset are missing |
| Rocket explosion | `GameScene.ts:1584-1605`; `ProjectileRenderer.ts:92-108` | Triggered when a rocket id disappears. Lasts 15 render frames. Outer circle `#ff6600` at `alpha·0.6`, radius `40·(1 − alpha·0.5)` (grows from 20 to 40 px). Inner `#ffcc00` at `alpha·0.4`, half the radius. Plays the `explosion` SFX | missing | Exact | Detect from the view's projectile ids, as the attract diff does. Splash radius in the sim is 40 |
| Dust: landing | `GameScene.ts:460-483,2122-2130` | 5 particles to the left and 5 to the right at the feet, x jitter ±6. Speed 25-55; angle 160-200° (left) or −20-20° (right); scale 0.6→0; alpha 0.7→0; life 350-600 ms; gravityY −5 | missing | Exact | `dust.png` is already bundled (`assets/dust.png`) |
| Dust: ground jump | `GameScene.ts:2131-2137` | 4 + 4 sideways particles at the feet, jitter ±4 | missing | Exact | |
| Dust: double jump | `GameScene.ts:447-457,2138-2143` | 12 particles in an arc below the feet (±12 px, feet − 4). Speed 20-60, angle 200-340°, gravityY 20 | missing | Exact | |
| Pickup "collected" pop | `GameScene.ts:485-491,1647-1656` | 6 frames of 32×32 at 20 fps, one-shot at (pickup.x, pickup.y + 20), depth 25 | missing | Exact | `collected.png` is already bundled |
| Pickup idle look | `GameScene.ts:1660-1690` | Gun icon at scale 0.6. Bob `sin(tick·0.08)·2` px. Alpha `0.9 + sin(tick·0.06)·0.1`. One glow dust particle every 8 ticks within ±8 px (speed 5-15, scale 0.4→0, life 600-1000 ms, gravityY −10) | partial | Exact | `render/Pickups.tsx` bobs at 0.8 Hz from wall-clock time. Switch it to the tick-based formula, and add the alpha shimmer and glow |
| Death ragdoll | `GameScene.ts:1854-1965`; `scenes/RagdollSystem.ts` | On a fresh death: play `hit`. `vx·1.5`; `vy = min(vy,−2)·1.2 − 3` (always pops up); spin ±6 rad/s in the direction of motion (if \|vx\| > 0.5), otherwise ∓5 (falls backward). Rotation clamps at ±90°. Gravity `GRAVITY·60·dt`. Lands only on surfaces below it. Bounce: `vy·−0.45`, `vx·0.7`. Settles after 3 bounces or when \|vy\| < 1.5. Walls: ×0.4. Alpha 0.9 while flying, 0.5 once settled (+6 px). Drawn behind the living. Reset on respawn (invincible flag) | missing | Exact | `Bird.tsx:89-91` just hides dead birds. This is the biggest visual gap |
| Respawn marker | `GameScene.ts:1967-1975` | While dead with lives > 0: a 24×32 rectangle pulsing `sin(tick·0.15)·0.3 + 0.5` at the spawn point, in the player colour (`#4fc3f7`, `#ef5350`) | missing | Adapted | Only visible in warmup and tutorial (1 life per round). FFA needs 4 slot colours |
| Invincibility blink | `GameScene.ts:2010-2017,2070,2105` | Hidden when `tick % 6 < 3`; otherwise alpha 0.6 on the body and gun | missing | Exact | The flag bit is `INVINCIBLE = 2` (`state.rs:18`) |
| Wall-slide nudge | `GameScene.ts:2062-2067` | Shift the sprite 4 px toward the wall while sliding, except at the map edges | missing | Exact | |
| Gun anchoring | `constants.ts:62-68`; `GameScene.ts:2083-2113` | Per gun: offsets (14, 6.5), (4.5, 11.5), (7, 8.5), (5, 8), (11.5, 6.5); scale 0.5. While wall-sliding the gun points away from the wall | partial | Adapted | `guns.ts:81-87` holds different offsets for the redrawn guns. That's acceptable because the art is new (deviation 5). Wall-slide flip is missing |
| Gun bob | `constants.ts:62-68`; `GameScene.ts:2094-2098` | `sin(frameIdx/totalFrames·2π)·bobAmplitude` (0.6-1 px) on **every** animation, synced to the sprite frame | partial | Exact | `Bird.tsx:151-153` bobs only while running, as a 0/0.5 px step |
| Gun art | `public/sprites/gun-*.png` | 5 gun sprites | have | Adapted | Redrawn as pixel art (`guns.ts:14-79`). Credit them in CREDITS |
| Local smoothing and remote dead reckoning | `GameScene.ts:1744-1821` | Local: `smoothLerp 0.3`, capped at 15 px per tick, snaps past 200 px, snaps y when grounded. Remote: velocity plus parabolic y, pulled 0.4 toward the server, snaps past 160 px | missing | Adapted | Needed only for S08 netcode. Local play interpolates between ticks (`driver.ts:29-30`, `lerp.ts`) |

### 2.6 Character animation

All sheets are 32×32 at 20 fps (`constants.ts:31-39`). Target: `sprites.ts:23-31`, `Bird.tsx:45-55`.

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| idle | `constants.ts:32`; `GameScene.ts:2056-2057` | 11 frames, looped. Grounded with \|vx\| ≤ 0.5 | have | Exact | |
| run | `constants.ts:33`; `GameScene.ts:2054-2055` | 12 frames, looped. Grounded with \|vx\| > 0.5 | have | Exact | |
| jump | `GameScene.ts:2050-2051` | 1 frame. Airborne with vy < 0 | have | Exact | |
| double-jump | `GameScene.ts:2048-2049` | 6 frames, once. Airborne, vy < 0, `jumpsLeft == 0` **and unarmed** | partial | Exact | The target omits the unarmed check (`Bird.tsx:50-51`) |
| fall | `GameScene.ts:2052-2053` | 1 frame. Airborne with vy ≥ 0 | have | Exact | |
| wall-jump (slide) | `GameScene.ts:2046-2047` | 5 frames, looped, while `wallSliding` | have | Exact | |
| hit (death) | `GameScene.ts:1880-1884` | 7 frames, once, on death, together with the ragdoll | missing | Exact | Arrives with the ragdoll |
| hit (damage) | none | None: the reference shows nothing when damaged | have | Additive | `Bird.tsx:24-25,98-101`: 0.3 s of `hit` after HP loss |
| Taunt (crouch) | `GameScene.ts:427-433,2031-2045` | On the taunt button's rising edge **while grounded**: play `hit` frames 2-6 at 20 fps once (restart if pressed again) and play the hero's taunt sound (interrupting). Local input is read directly for zero latency | partial | Exact | `Bird.tsx:47` shows the full `hit` animation for as long as Taunt is **held**. Change it to edge-triggered frames 2-6 plus the sound |
| Countdown idle | `GameScene.ts:2035-2037` | Idle is forced while not playing | missing | Exact | |
| Facing flip | `GameScene.ts:2068` | `flipX` when facing left | have | Exact | `Bird.tsx:127` |
| Hero assignment | `main.ts:24-36`; `SettingsPanel.ts:392-417`; `GameScene.ts:531-536` | Home and away hero preferences (stored in `localStorage`); the opponent gets a random different hero | partial | Adapted | FFA: every slot shows a distinct hero (`HEROES`). Add a "your hero" choice |

### 2.7 Audio events

In the reference, **every gameplay SFX is synthesised in Web Audio** (`audio/sfx.ts`) because the MP3s for them don't exist. `public/audio` holds only the BGM and the four taunts. Events come from diffing consecutive states (`AudioManager.ts:186-220`), except explosion, taunt, match start and match end. Every event is scaled by `sfxVolume` (default 0.8, `AudioManager.ts:15`).

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| `shoot` | `sfx.ts:12-23`; `AudioManager.ts:187-198` | Square wave 440→880 Hz over 50 ms, gain `vol·0.7`, linear fade. Plays on a new projectile id for any non-SMG weapon. Interrupts itself. **At most one shoot sound per frame** | missing | Adapted | Re-source per weapon (pistol, shotgun, sniper, rocket launch). Having more than one is Additive. Keep the one-per-frame rule |
| `shoot-smg` | `sfx.ts:151-177` | A prebuilt 20 ms square buffer sweeping 900→1200 Hz, amplitude 0.4, linear fade. Doesn't interrupt | missing | Exact | Needs a 5-voice cap (`@arena/audio` `MAX_VOICES_PER_SOUND`) |
| `hit` | `sfx.ts:25-48`; `AudioManager.ts:205-207` | 80 ms white noise (gain `vol·0.35`) plus a 200 Hz sine thud (`vol·0.3`). Fires when any player's HP drops and stays above 0 | missing | Adapted | Add an "own bird hit" variant with a different pitch (Additive) |
| `death` | `sfx.ts:50-61`; `AudioManager.ts:208-210` | Sawtooth 600→100 Hz over 300 ms, `vol·0.6`. Fires when the alive flag drops | missing | Exact | |
| `pickup` | `sfx.ts:63-77`; `AudioManager.ts:211-213` | Sine arpeggio 400/533/667/800 Hz, 40 ms per note, `vol·0.5`. Fires when the weapon changes to a non-null value | missing | Exact | |
| `jump` | `sfx.ts:121-132`; `AudioManager.ts:214-217` | Sine 300→500 Hz over 80 ms, `vol·0.4`. Fires when `jumpsLeft` decreases while alive (both jumps use the same sound) | missing | Adapted | Add a higher-pitched double-jump variant (Additive) |
| `explosion` | `sfx.ts:95-119`; `GameScene.ts:1590-1594` | Sine 80→30 Hz over 250 ms (`vol·0.8`) plus 150 ms noise (`vol·0.6`). Fires when a rocket id disappears | missing | Exact | |
| `match-start` | `sfx.ts:79-93`; `GameScene.ts:773,798` | A C-E-G sine chord (261.6/329.6/392 Hz), 200 ms, `vol·0.4`. At GO of every round | missing | Exact | |
| `match-end` | `sfx.ts:134-149`; `GameScene.ts:1202` | Descending C5-G4-E4 (523.3/392/329.6 Hz), 100 ms each, `vol·0.4`. At match end | missing | Adapted | Split into win and lose stings from the local player's point of view (Additive) |
| Taunt clips | `constants.ts:73-78`; `GameScene.ts:207-214,2041-2042`; `AudioManager.ts:46-58` | Ninja Frog → `frog-croak.mp3`, Mask Dude → `ooga.mp3`, Pink Man → `wub.mp3`, Virtual Guy → `pop.mp3`. About 0.3-0.45 s each. `stopByKey` then play, so taunts are spammable | missing | Adapted | Re-source (deviation 5) |
| Events with no sound | none | Landing, stomp start, shake press, stomp escape, countdown ticks, sudden-death warning, zone damage, empty ammo, respawn, round win, footsteps: all silent | missing | Additive | Worth adding for "feels real" (S09). See §3 |
| Web Audio unlock | `AudioManager.ts:32-43`; `sfx.ts:191-201` | Resume a suspended AudioContext on play | have | Adapted | `@arena/audio` unlock (`packages/audio/src/unlock.ts`) |
| UI sounds | none | None: the reference has no UI clicks | have | Additive | `hub-ui` sprite: `ui.click`, `ui.confirm`, `ui.back`, `ui.coin`, `ui.whoosh` (`assets/audio/hub-ui.json`) |
| Wager sounds | none | None | have | Additive | `wager.lock/drumroll/win/bigwin/lose/coins` (`wager/audio.ts`) |

### 2.8 Music

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Playlist | `AudioManager.ts:92-151` | 5 tracks (`bgm-1..5.mp3`, 160-238 s, about 13.5 MB) shuffled with no immediate repeat. `loop: false`; when a track ends the next one starts. A replaced track fades out over 1 s | missing | Adapted | Re-source (NCS tracks, deviation 5). See §4 |
| Lazy load | `GameScene.ts:205-206`; `AudioManager.ts:109-127` | Tracks load on demand, never at boot | missing | Exact | |
| Default state | `SettingsPanel.ts:327-341`; `index.html:1897-1906` | **Music is off by default** for new users. Volume defaults to 10% | missing | Adapted | Our settings default music on at 0.6 on a bus (`stores/settings.ts:7`). Deliberate: the first impression shouldn't be silent (chickenz.md:393) |
| Start conditions | `main.ts:269-284`; `GameScene.ts:242-246,777` | Starts on the first click or keydown, and again when a match starts | missing | Exact | |
| Focus fade | `AudioManager.ts:225-248`; `GameScene.ts:506-511` | 400 ms fade out on blur or a hidden tab, 400 ms fade in on focus. Resumes a suspended context | missing | Exact | Check whether `@arena/audio` already does this |
| Mute button | `SettingsPanel.ts:343-359` | The top-bar note icon toggles music. Unmuting at volume 0 resets it to 10 | partial | Adapted | The hub has a global mute setting but no music-only toggle |
| Ducking during suspense | none | None | have | Additive | `wager/audio.ts:24-36` (−30 dB) |

### 2.9 Settings panel

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Opening and closing | `SettingsPanel.ts:125-165`; `main.ts:482-494` | Gear button, ✕ button, click on the backdrop, or Esc | have | Adapted | `ui/SettingsSheet.tsx` |
| Username | `SettingsPanel.ts:167-199` | 1-7 chars, `[A-Za-z0-9_]`, uppercase display, "Saved!" in `#66bb6a` for 1.5 s | partial | Adapted | Identity lives in S04 guest names |
| Character home/away | `index.html:1694-1712` | ↑/↓ cycle through the 4 heroes | missing | Adapted | Becomes "my hero" in FFA |
| Controls | `index.html:1713-1752` | 5 actions × 2 slots plus Reset Defaults | missing | Exact | |
| Music on/off | `index.html:1755-1761` | Checkbox | partial | Adapted | Global mute only |
| Music volume | `index.html:1762-1768` | Slider 0-100, default 10 | have | Adapted | `musicVolume`, default 0.6 |
| SFX volume | `index.html:1769-1775` | Slider 0-100, default 80 | have | Adapted | `sfxVolume` 0.9, plus a UI volume (Additive) |
| Dynamic Camera | `index.html:1779-1786`; `SettingsPanel.ts:370-374` | Checkbox, default on. Off gives the fixed full-arena view | missing | Exact | |
| Fullscreen | `SettingsPanel.ts:378-390` | Top-bar toggle, ⛶ or ✖ | missing | Exact | |
| Version footer | `main.ts:447-452` | `Version: <hash> \| <date>` | missing | Additive | Optional |
| Reduced motion, haptics | none | None | have | Additive | `stores/settings.ts:17-18` |

### 2.10 Tutorial

`tutorial/Tutorial.ts`. It runs on a local wasm session using `TUTORIAL_MAP`, which is ARENA plus a high platform `{x:368, y:144, w:224, h:16}` (`constants.ts:89-92`), with 99 lives and no clock. P2 is banished except where noted. The step box sits 60 px from the top, is centred, has a 2 px `#ffee58` border, and holds 12 px white text (`index.html:1652-1654`). Completion sets `localStorage["chickenz-tutorial-done"]` (`Tutorial.ts:13,97-103`).

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| First-run prompt | `main.ts:318-360`; `index.html:1642-1651` | "Looks like you're new here / Learn the basics in a quick tutorial" with [Play Tutorial] and [Skip]. Shown when the done flag is missing | missing | Adapted | Hub onboarding (S04) should offer it the first time Chickenz is chosen |
| Step 1: move | `Tutorial.ts:34-38,155-158` | "Press A/D to move" (mobile: "Use joystick to move"). Done after 30 ticks with Left or Right held | missing | Exact | Generate the key names from the current bindings |
| Step 2: jump | `Tutorial.ts:39-43,160-163` | "Press W to jump" (mobile: "Push joystick up to jump"). Done on any Jump press | missing | Exact | |
| Step 3: double jump | `Tutorial.ts:44-48,165-169` | "Press W again mid-air to double jump!\nReach the high platform!" (mobile: "Push joystick up again while airborne!…"). Done when airborne with `jumpsLeft == 0` | missing | Exact | Done doesn't actually require reaching the platform |
| Step 4: weapon | `Tutorial.ts:49-53,171-174` | "Walk over a weapon to pick it up". Done when armed | missing | Exact | |
| Step 5: shoot | `Tutorial.ts:54-58,176-179` | "Press SPACE to shoot" (mobile: "Tap the red button to shoot"). Done on any Shoot press | missing | Exact | |
| Step 6: stomp escape | `Tutorial.ts:59-63,181-228` | "You've been stomped!\nMash LEFT and RIGHT to escape!" (mobile: "Spin the joystick to escape!"). Setup puts P2 on P0's head with the stomp state armed; P0's HP is pinned at 100. Done when `stompedBy` clears | missing | Adapted | Needs a sim hook to seed a stomp. The reference uses `export_state`/`import_state` edits; our sim has `snapshot`/`restore` (`wasm.rs:92-97`). A tutorial-only setup function in the crate would be cleaner |
| Step 7: kill | `Tutorial.ts:64-68,230-281` | "Now take them out!" P2 appears 120 px ahead at 15 HP with stomp cooldown 99,999. Done when P2 dies | missing | Adapted | The same sim hook |
| Step 8: finish | `Tutorial.ts:69-74,318-324` | "You're ready! Good luck!" Advances automatically after 3,000 ms | missing | Exact | |
| Skip and replay | `Tutorial.ts:112-115`; `main.ts:757-775` | Replay from ⋯ → Tutorial. The `btn-tutorial-skip-step` handler is bound, but that element doesn't exist in the HTML | missing | Adapted | Give us a visible "Skip tutorial" button |
| Username after tutorial | `main.ts:365-407`; `index.html:1655-1665` | "Choose a Username", 1-7 chars, "LET'S GO!" | missing | Adapted | S04 guest identity |
| HUD in tutorial | `GameScene.ts:2226-2233`; `GameScene.ts:690-691` | Timer, round, sudden-death and weapon HUD hidden | missing | Exact | |

### 2.11 Mobile and responsive

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Viewport sizing | `game.ts:9-25`; `main.ts:148-157` | The canvas fills the window at native DPR, height-locked to 540. Resize is debounced by 200 ms | have | Adapted | R3F canvas plus `engine/AdaptiveDpr.tsx` |
| Media queries | `index.html` (none) | No `@media` rules. Layout adapts only through the touch class and VIEW_W | partial | Adapted | Hub is responsive. The in-game HUD must follow the 16 px gutter rule |
| Touch detection | `main.ts:42-43` | Adds `body.touch` | missing | Exact | |
| Touch controls lifecycle | `ServerConnector.ts:75,103`; `ui/LobbyPanel.ts:105-108` | Shown when warmup, a match or the tutorial starts; hidden on return to the lobby | missing | Exact | |

### 2.12 Results, history and other screens

| Surface | Reference evidence | Reference behavior | Target status | Class | Notes |
|---|---|---|---|---|---|
| Post-match screen | `GameScene.ts:1191-1208`; `ServerConnector.ts:142-148` | No results screen: a banner, then back to the lobby after 2.5 s | missing | Additive | The hub has a `results` phase. Show placements, kills and round wins, with Rematch and Back |
| Match history | `ui/MatchHistoryPanel.ts:83-116` | Rows show "P1 vs P2", score, time ago, a proof badge, and [Replay] [Share] [DL] (plus [Settle] for ranked) | missing | Adapted | Drop proof and settle (deviation 3). Keep replay and share |
| Match detail | `ui/MatchDetailView.ts` | ZK proof grid, Stellar and Etherscan transaction timeline | missing | Blocked | Deviation 3 |
| Leaderboard | `ui/LeaderboardPanel.ts` | Ranked names; your own row highlighted | missing | Adapted | Convex leaderboards (points and rank only) |
| Gate and wallet | `index.html:1589-1603`; `ui/WalletController.ts` | Passkey login and register | missing | Blocked | Deviation 3 |
| Back-a-Bird wager | none | None | have | Additive | `wager/**`: bet sheet, suspense, fight bar, result card, presented from a VRF class |
| 4-bot attract exhibition | none | None | have | Additive | `sim/driver.ts`, `Scene.tsx`. Bots are labelled, with difficulty 55/70/80/90 |

---

## 3. Gameplay SFX to source (ElevenLabs sound effects)

**Style for every prompt:** 16-bit pixel platformer shooter, short, punchy and dry. No reverb tail, no music, mono-compatible.

- **Raw takes:** `assets-src/chickenz/sfx/`.
- **Output:** pack into one `chickenz-sfx` sprite (webm and m4a) through `@arena/audio`.
- **Variations:** generate 2-3 takes per event for the `~n` variants.
- **Prompt influence:** about 0.6.

| Event (key) | Trigger | Parity | Prompt | Duration (s) |
|---|---|---|---|---|
| `chickenz.shoot.pistol` | New pistol projectile | Exact (`shoot`) | "16-bit retro game pistol shot, tight square-wave pop with a quick upward chirp, very short, dry, no reverb" | 0.5 |
| `chickenz.shoot.shotgun` | New shotgun volley | Adapted | "16-bit arcade shotgun blast, crunchy noise burst with a low punch, chiptune style, short and dry" | 0.5 |
| `chickenz.shoot.sniper` | New sniper round | Adapted | "16-bit sniper rifle crack, sharp high-pitched zap with a thin metallic tail, retro console, dry" | 0.6 |
| `chickenz.shoot.rocket` | New rocket | Adapted | "8-bit rocket launcher whoosh, rising hiss with a thump at the start, retro platformer, short, dry" | 0.7 |
| `chickenz.shoot.smg` | New SMG round | Exact (`shoot-smg`) | "tiny 16-bit machine gun tick, single very short square-wave click, bright, dry, made to repeat rapidly" | 0.5 |
| `chickenz.hit` | Any bird loses HP and survives | Exact | "16-bit game hit sound, short noise crunch with a low thud, cartoon impact, dry, no reverb" | 0.5 |
| `chickenz.hit.self` | Local bird loses HP | Additive | "retro 16-bit player damage sound, quick descending blip with a crunchy smack, urgent, dry" | 0.5 |
| `chickenz.death` | Alive flag drops | Exact | "16-bit character death sound, sawtooth pitch falling fast from high to low, comedic retro platformer, dry" | 0.7 |
| `chickenz.pickup` | Weapon picked up | Exact | "16-bit weapon pickup jingle, fast four-note rising sine arpeggio, bright and cheerful, dry" | 0.5 |
| `chickenz.jump` | First jump | Exact | "16-bit platformer jump, short rising sine boing, light and springy, dry" | 0.5 |
| `chickenz.jump.double` | Mid-air jump | Additive | "16-bit double jump, higher-pitched quick rising chirp with a soft flutter, retro platformer, dry" | 0.5 |
| `chickenz.land` | Landing | Additive | "soft 16-bit landing thump, tiny dusty puff, very short and quiet, retro platformer, dry" | 0.5 |
| `chickenz.explosion` | Rocket id disappears | Exact | "16-bit explosion, deep booming pitch drop with a crackly noise burst, chunky retro arcade, short, dry" | 1.0 |
| `chickenz.stomp` | A stomp starts (on a head) | Additive | "cartoon 16-bit head stomp, squishy bonk with a boing, retro platformer, dry" | 0.5 |
| `chickenz.shake` | Each correct L/R shake press | Additive | "tiny 16-bit wiggle blip, quick rattling click, retro, dry" | 0.5 |
| `chickenz.escape` | Stomp broken free | Additive | "16-bit break-free sound, springy pop with a quick upward sweep, triumphant little burst, dry" | 0.5 |
| `chickenz.countdown.tick` | "3", "2", "1" | Additive | "16-bit countdown beep, single clean square-wave blip, arcade start timer, dry" | 0.5 |
| `chickenz.countdown.go` | GO (`match-start`) | Exact | "16-bit arcade GO! stinger, bright major chord blip, short and punchy, dry" | 0.6 |
| `chickenz.suddendeath` | Sudden-death warning, then start | Additive | "16-bit alarm siren blip, two-tone urgent warning, retro arcade, short, dry" | 1.2 |
| `chickenz.zone.tick` | Damage from the zone | Additive | "short 16-bit electric sizzle zap, retro, quiet, dry" | 0.5 |
| `chickenz.empty` | Shoot with no ammo | Additive | "16-bit empty gun click, dry tiny metallic tick, retro" | 0.5 |
| `chickenz.respawn` | Invincible flag set on respawn | Additive | "16-bit respawn shimmer, quick sparkly rising arpeggio, retro platformer, dry" | 0.6 |
| `chickenz.round.win` | Round won (banner) | Adapted (`match-end`) | "16-bit round win jingle, short three-note rising fanfare, chiptune, dry" | 1.2 |
| `chickenz.match.win` | The local bird wins the match | Adapted | "16-bit victory fanfare, bright chiptune flourish, arcade champion, short, dry" | 2.0 |
| `chickenz.match.lose` | The local bird loses the match | Adapted | "16-bit game over jingle, descending three-note sine melody, gentle and comedic, dry" | 1.5 |
| `chickenz.wipe` | Diamond transition | Additive | "retro 16-bit screen wipe swoosh, quick airy sweep, arcade transition, dry" | 0.6 |
| `chickenz.taunt.frog` | Ninja Frog taunt | Adapted (replaces `frog-croak.mp3`) | "single cartoon frog croak, short and funny, clean, dry, no background" | 0.5 |
| `chickenz.taunt.mask` | Mask Dude taunt | Adapted (replaces `ooga.mp3`) | "short goofy cartoon caveman grunt 'ooga', comedic, dry, no background" | 0.5 |
| `chickenz.taunt.pink` | Pink Man taunt | Adapted (replaces `wub.mp3`) | "short wobbly cartoon 'wub' bass wobble, comedic synth, dry" | 0.5 |
| `chickenz.taunt.virtual` | Virtual Guy taunt | Adapted (replaces `pop.mp3`) | "single cartoon bubble pop, bright and cute, dry, no background" | 0.5 |

**Mixing rules carried over from the reference:**
- At most one `shoot` per frame (`AudioManager.ts:196`).
- `shoot` (non-SMG) and taunts interrupt their previous instance (`AudioManager.ts:46-58`).
- SMG overlaps, with a voice cap.
- Default SFX level about 0.8 of the SFX bus.

**Fallback:** port the procedural `sfx.ts` synth (licence-free, and our own code under MIT) as a zero-asset fallback. It also serves as the exact audio baseline until the ElevenLabs takes land.

---

## 4. Music

**What the reference does** (`AudioManager.ts:92-151,225-248`; `SettingsPanel.ts:327-366`; `main.ts:269-284`):
- **Tracks:** a playlist of 5 upbeat electronic tracks (NCS; `bgm-3` is Ephixa & Jim Yosef "Everlasting"), 160-238 s each.
- **Order:** shuffled, never the same track twice in a row. No looping: the next track starts when one ends, and a replaced track fades out over 1 s.
- **Loading and start:** lazy-loaded; starts on the first gesture and whenever a match starts.
- **Focus:** fades out over 400 ms on blur or a hidden tab, and back in over 400 ms on focus.
- **Defaults:** 10% volume, and **off by default**.
- **In-match behaviour:** none. Music doesn't change for countdown, sudden death or rounds.

**What we should do (Adapted):**
- **Tracks:** two original ElevenLabs instrumentals, each about 120 s and loop-clean, playing on the `music` bus. Keep the shuffle and no-repeat rule, plus the 1 s crossfade and the 400 ms focus fade.
- **Default:** music on at the hub's level. This is a deliberate departure: the first impression shouldn't be silent.
- **Additive:**
  - Duck −6 dB under the countdown and announce stingers.
  - Raise a low-pass filter or intensity during sudden death.
  - Duck −30 dB under the wager drumroll (already built).
- **Budget:** 2 × 120 s fits comfortably in the Starter plan.

**Prompt for track A (main battle loop, about 120 s):**
> Instrumental, loopable, upbeat 16-bit chiptune arcade battle theme for a chaotic 4-player pixel platformer shooter. 150 BPM, bright square-wave lead, punchy triangle bass, crisp noise-channel drums, playful and mischievous with a heroic hook. Energetic but not harsh, sits under sound effects, no vocals, seamless loop ending that returns to the opening bar, about 120 seconds.

**Prompt for track B (alternate, about 100 s):**
> Instrumental, loopable, bouncy retro arcade chiptune for a cartoon pixel-art brawler. 140 BPM, funky pulse-wave bassline, catchy call-and-response lead, snappy drums with fills every 8 bars, cheeky and fun, leaves room for gameplay sounds, no vocals, clean loop point, about 100 seconds.

Raw takes go in `assets-src/chickenz/music/`. Log both prompts and the plan in `docs/CREDITS.md`.

---

## 5. Implementation order (to reach playable parity)

1. **Human play vs bots (one local match): controls, HUD and sound.** Top priority.
   1. `InputManager` port:
      - Default two-slot bindings and Mouse0.
      - Clear held keys on blur; aim from Left/Right.
      - Feeds `sim.set_input(0, …)`.
      - Slots 1-3 run `set_bot` with labelled difficulties.
   2. Match flow:
      - Countdown 3-2-1-GO at the 350/400 ms timings, with the sim frozen.
      - `ROUND N` popup.
      - Round-end banner while players keep moving: 0.5 s linger, then 1 s, then 0.75 s.
      - Diamond wipe, map rotation, first to 3 of 5.
      - Match-end banner, then the `results` phase.
   3. HUD (Silkscreen):
      - Timer, round text and pips.
      - HP bars and names (bots labelled).
      - Weapon and ammo; the sudden-death countdown text.
      - "SHAKE HIM OFF!" with its bar.
   4. Gameplay SFX from state diffing: shoot and SMG, hit, death, pickup, jump, explosion, match start and end. Use the procedural `sfx.ts` port now, and swap in ElevenLabs takes when §3 is sourced.
   5. Dynamic camera: FFA bounding box, 1.3/1.0 at 250/500 px, 80 px padding, kill cam at 1.5, round-start snap.
2. **Fidelity fixes in the renderer:**
   - Death ragdoll and the `hit` animation.
   - Invincibility blink.
   - Taunt as edge-triggered frames 2-6 plus the hero sound.
   - Unarmed check on double-jump.
   - Wall nudge and gun flip.
   - Frame-synced gun bob.
   - Restore `BULLET_PX` sizes, the muzzle snap and gun-height offset.
   - Tick-based pickup bob and shimmer.
3. **Particles and effects:**
   - Dust for landing, jump and double jump.
   - Collected pop and pickup glow.
   - Rocket explosion rings.
   - Respawn marker.
   - Then the S09 Additive juice: muzzle flash, damage flash, shake, render-only hit-stop.
4. **Settings parity:**
   - Controls rebinding with Reset Defaults.
   - The Dynamic Camera toggle.
   - A music on/off toggle and fullscreen.
   - "My hero" choice.
   - The typing guard.
5. **Music:** source tracks A and B. Playlist shuffle, crossfade, focus fade, lazy load.
6. **Touch controls:**
   - Joystick with the jump pulse, tap to taunt and spin to shake.
   - Shoot button.
   - Layout shifts for touch; shown only while playing.
7. **Tutorial:**
   - The 8 steps on `TUTORIAL_MAP`, plus a sim hook to seed the stomp and kill setups.
   - First-run prompt, skip, and replay from the Chickenz cabinet.
8. **Online (S08):**
   - Colyseus rooms and a warmup room (solo practice, room code, copy link, and a clearly labelled "Play vs bots").
   - Prediction and smoothing.
   - High-ping warning.
9. **Results, history, replays and leaderboard:**
   - Results screen (placements, kills, round wins; Rematch).
   - Convex match history with Replay and Share.
   - Replay controls (Space, Up/Down, Esc).
   - Points leaderboard.
10. **Tournaments and spectating (S27):** bracket, VS card timings, spectate overlay.
