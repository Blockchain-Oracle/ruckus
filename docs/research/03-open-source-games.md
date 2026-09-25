# 03 — Open-source browser games to fork into a VRF casino round

Researched 2026-09-25 for Chain Jam Vol. 1 (deadline Sun Sep 27 2026, 23:59 UTC). Stars, last-commit dates, commit counts and licenses were checked with `gh api` on 2026-09-25. "2026 commits" is the number of commits since 2026-01-01; the count is capped at 100 because of API paging. The last-commit date comes from the default branch; GitHub's `pushed_at` can be later.

## The key constraint (read this first)

Jam rules (see `/CLAUDE.md`) say **all outcomes come from the VRF `bytes32`**. The player's aim or skill cannot decide the payout. Every skill game below therefore has to be turned into an **outcome-first** round:

1. The player picks a *call* or risk tier, such as a pocket, a "hole-in-one" bet or a "balls on the break" band. That choice sets the paytable row.
2. The VRF word picks the outcome bucket through rejection sampling, then picks a variant inside that bucket.
3. The game **replays a pre-recorded or deterministically simulated physics run** that produces exactly that outcome. You build a library offline: simulate N thousand shots, bucket them by result, and ship `{bucket → [seed/shot params]}`. The contract never simulates physics. The frontend only needs the physics to be *deterministic*.

This rewards games that have deterministic physics or support **record and playback**. It also makes novelty against `docs/competitors.md` easy: there is currently **no pool, golf, darts, archery, cup-pong, bowling or basketball entry**. Battleship (#47), Claw Machine (#7), a stacking game (Clatter #4), chess (ChessChuck #20) and a tank game (Deadline City #44) already exist.

## Honest market finding

Across GitHub topic searches (html5-game, browser-game, threejs-game, webgl-game, multiplayer-game, phaser3, js13k, pixijs-game, io-game, plus per-genre topics: billiards, minigolf, darts, archery, bowling, basketball, battleship, artillery, pinball, word-game, beer-pong, air-hockey, penalty, gamepigeon), four awesome lists (bobeff, leereilly, proyecto26/awesome-jsgames, michelpereira; 684 repos bulk-checked), and Firecrawl web searches:

- **Only one GamePigeon-genre web game is popular, actively maintained and premium: `tailuge/billiards`.**
- Most GamePigeon-style web clones have fewer than 50 stars, have been abandoned since 2014–2023, or have **no license** (which means all rights reserved).
- The literal GamePigeon reimplementation (`OpenBubbles/OpenPigeon`) is Android/Kotlin, and its license forbids reusing the assets.
- The cleanest-licensed premium option is **Kenney's Godot starter kits** (MIT code plus CC0 models and sounds), exported to web.

---

## Top 5 summary

| # | Repo | Why | License | Feasibility (2.5 days) |
|---|---|---|---|---|
| 1 | [tailuge/billiards](https://github.com/tailuge/billiards) | Best-in-class browser pool physics (8-ball, 9-ball, snooker, 3-cushion), bots, online multiplayer, **record/playback of breaks**, 100+ commits in 2026 | **GPL-3.0** (frontend bundle must be GPL and you must publish the source) | **High** for a "Break Bet" round |
| 2 | [LCmaster/minigolf](https://github.com/LCmaster/minigolf) | Full 3D mini golf (Threlte, three.js and Rapier), spline level editor, 100+ commits in 2026 | MIT (asset provenance not stated) | **Medium-High** |
| 3 | [KenneyNL/Starter-Kit-Racing](https://github.com/KenneyNL/Starter-Kit-Racing) (plus the Match-3 and other Kenney kits) | Polished Kenney look; **MIT code + CC0 models and sounds**, the cleanest licensing found | MIT + CC0 | **Medium** (Godot 4.6 web export and a JS bridge to the SDK) |
| 4 | [KilledByAPixel/LittleJS](https://github.com/KilledByAPixel/LittleJS) | 4.2k stars, 100+ commits in 2026; a tiny engine with Box2D, particles and sound. The fastest way to build your own "cup pong", "darts" or "coin toss" with juicy feel | MIT | **High** (engine, not a finished game) |
| 5 | [iamkun/tower_game](https://github.com/iamkun/tower_game) | 1.6k stars, a polished Tower Bloxx clone with sound, ES6 canvas, tiny codebase | MIT (bundled art/music provenance not stated) | **High**, but novelty overlaps with Clatter (#4) |

Notes on the top 5:
- **Pure pick:** #1 billiards "Break Bet". It is the only candidate that meets the whole bar (popular, maintained, premium), and its replay feature fits the outcome-first model.
- **Licensing:** if GPL is unacceptable to the organizers, #3 Kenney kits are the safe choice.

---

## Ranked candidates

The columns are: stars · last commit · 2026 commits · license · stack.

### 1. tailuge/billiards — 3D pool and billiards physics
- **URL:** https://github.com/tailuge/billiards · demo https://billiards.tailuge.workers.dev/
- **Stats:** 253★ · last commit 2026-09-25 · 100+ commits in 2026
- **License:** **GPL-3.0**. It covers code and repo assets, since there is no separate asset license. The repo ships `dist/models` (7 files), `dist/sounds` (5 files) and `dist/images`.
- **Stack:** TypeScript, three.js, own physics (Han 2005 ball model, cushion model).
- **What it is:** 8-ball, 9-ball, snooker, three-cushion and Sagu rule sets; bots ("Claw", "TheFarJaw"); a multiplayer lobby; hourly arenas; leaderboards; cue customisation. It also has **record and playback breaks** and shareable replay links. It runs on mobile.
- **Why premium and fun:** it has the most physically accurate spin, throw and cushion model of any open-source web pool game, and it is very actively developed.
- **Casino round, "Break Bet" / "Call the Break":**
  - The player bets on how many balls drop on the break (bands such as 0 / 1 / 2 / 3+), or on "8-ball on the break" as a jackpot.
  - Offline, simulate thousands of breaks with the engine's deterministic sim and bucket the recorded breaks by outcome.
  - The VRF picks the bucket, then the replay index, and the client plays that recorded break.
  - A second mode, "Call your shot", works the same way. The player chooses a pocket or difficulty tier, the VRF decides pot, miss or scratch, and the game replays a matching recorded shot.
- **Risks:**
  - GPL-3.0 applies to the JS bundle served to players. This is fine for sharing source with the organizers, but a closed commercial integration is not possible without relicensing.
  - The codebase is large, so strip it down to one table and one replay path.
- **Feasibility:** **High** for Break Bet (replay already exists); Medium for full shot-calling.

### 2. LCmaster/minigolf — "Mini Golf Mania"
- **URL:** https://github.com/LCmaster/minigolf · demo https://minigolfmania.vercel.app
- **Stats:** **2★** (fails the popularity bar) · last commit 2026-09-09 · 100+ commits in 2026
- **License:** MIT. The `.glb` stages and ball models are in `static/` with no separate asset license, so confirm with the author.
- **Stack:** SvelteKit, Threlte (three.js), Rapier physics, Tailwind/Skeleton, Firebase (accounts and cloud levels).
- **What it is:** a 3D mini golf game with golf scoring terms (hole-in-one to bogey), a spline-based track editor, and level import/export.
- **Casino round, "Ace It":**
  - The player picks a hole and a bet: hole-in-one (high multiplier), birdie or better, or par or better.
  - The VRF picks the outcome, and a pre-baked putt from a library bucketed by strokes is replayed.
  - Rapier is deterministic on the same build, so offline bucketing works.
- **Risks:** remove Firebase; the stars are negligible, so check quality by playing the demo.
- **Feasibility:** **Medium-High**.

### 3. KenneyNL Starter Kits (Racing, Match-3, 3D-Platformer, City-Builder, FPS, Basic-Scene)
- **URLs:**
  - https://github.com/KenneyNL/Starter-Kit-Racing (415★, last commit 2026-08-21, 20 commits in 2026)
  - Starter-Kit-Match-3 (178★, 2026-08-22)
  - Starter-Kit-3D-Platformer (1,236★)
  - Starter-Kit-City-Builder (1,465★)
  - Starter-Kit-FPS (991★)
- **License:** **MIT code, and the READMEs state the models, sprites and sounds are CC0.** This is the safest commercial licensing in this report.
- **Stack:** Godot 4.6 (GDScript). Web export gives a static build; you call the SDK bridge through `JavaScriptBridge`.
- **What it is:** clean, Kenney-styled templates. Racing has arcade car controls, smoke and GridMap tracks.
- **Casino round:**
  - **Racing, "Photo Finish":** the player backs one of four cars or bets on a margin band. The VRF fixes the finish order and margins, and the AI cars follow scripted speed curves to hit them.
  - **Match-3, "Cascade call":** the player bets on the cascade depth. The VRF seeds the board refill, and cascades resolve deterministically.
  - Kenney's asset library also has minigolf, pirate and sports packs (CC0), so you can reskin into a GamePigeon-style game.
- **Risks:** Godot web export weight (roughly 30–40 MB WASM) and the bridge plumbing; a race bet is close to a "classic".
- **Feasibility:** **Medium**.

### 4. KilledByAPixel/LittleJS — engine plus examples
- **URL:** https://github.com/KilledByAPixel/LittleJS
- **Stats:** 4,184★ · last commit 2026-09-25 · 100+ commits in 2026
- **License:** MIT
- **Stack:** vanilla JS; WebGL batching; Box2D plugin; particles; ZzFX sound; examples for breakout, puzzle, platformer, box2d, three.js and a vite starter.
- **What it is:** not a GamePigeon game, but the fastest route to a *juicy, original* physics mini-game. The author is a js13k veteran, so the engine is built for small, polished games.
- **Casino round:** build "Cup Pong" or "Darts" on the Box2D example.
  - The VRF picks the landing cup or ring.
  - A deterministic Box2D replay, or an analytic arc solved to hit the target, animates the throw.
- **Feasibility:** **High**. You own the gameplay, so novelty and license are clean.

### 5. iamkun/tower_game — Tower Bloxx clone
- **URL:** https://github.com/iamkun/tower_game · demo https://iamkun.github.io/tower_game/
- **Stats:** 1,610★ · last commit 2025-08-29 · 0 commits in 2026 (dormant)
- **License:** MIT. The bundled `assets/*.png` and `bgm.mp3`/`.ogg` have no stated provenance.
- **Stack:** ES6 and Canvas, tiny.
- **Casino round:** a cash-out ladder where each floor is Perfect, Success or Fall, decided by the VRF. The swinging crane is visual only.
- **Risks:** close to Clatter (#4) and to a "crash"-style ladder, which the rules may see as a crash clone; not maintained in 2026.
- **Feasibility:** **High**, but novelty is Medium-Low.

### 6. kenrick95/c4 — Connect Four vs AI
- **URL:** https://github.com/kenrick95/c4 · demo https://kenrick95.github.io/c4/
- **Stats:** 281★ · last commit 2026-09-23 · 56 commits in 2026
- **License:** MIT
- **Stack:** TypeScript, Canvas, minimax AI with alpha-beta pruning.
- **Casino round, "Drop Call":** the player picks a column and a "connects within N drops" band. The VRF generates the whole drop sequence for both sides.
- **Risks:** the look is plain canvas, not premium; a reskin is needed.
- **Feasibility:** **High**; Premium: Low.

### 7. brianrisk/SYNTHBLAST-threejs-game — retro-synth tank arena
- **URL:** https://github.com/brianrisk/SYNTHBLAST-threejs-game · https://synthblast.com
- **Stats:** 142★ · last commit 2026-07-21 · 10 commits in 2026
- **License:** Apache-2.0 (commercial-friendly)
- **Stack:** plain JS, three.js, Vite.
- **What it is:** a synthwave tank shooter with levels and a zombie mode.
- **Casino round:** an auto-battle "survive N waves" bet. The VRF scripts the enemy spawns and hit rolls, and the player watches.
- **Risks:** Deadline City (#44) is a tank game; it is a real-time shooter, not a GamePigeon-style turn game.
- **Feasibility:** Medium.

### 8. honzaap/SlashSaber — Fruit-Ninja-like endless slasher
- **URL:** https://github.com/honzaap/SlashSaber · https://honzaap.github.io/SlashSaber
- **Stats:** 73★ · last commit 2026-08-31 · 3 commits in 2026
- **License:** **CC-BY-4.0** (commercial use allowed with attribution)
- **Stack:** three.js r153, Vue 3, TypeScript.
- **Casino round:** the player bets on the run length (obstacles cleared before 3 hits). The VRF determines where the chain breaks, and the slashing is auto-play or cosmetic.
- **Feasibility:** Medium.

### 9. brunosimon/folio-2025 — Bruno Simon's 2025 portfolio "game"
- **URL:** https://github.com/brunosimon/folio-2025 · https://bruno-simon.com
- **Stats:** 1,884★ · last commit 2026-04-07 · 46 commits in 2026
- **License:** MIT for the repo; the music in `static/sounds/musics` is CC0.
- **Stack:** three.js (WebGPU/TSL), physics vehicle, custom game loop.
- **Why:** it has the most premium-feeling web 3D scene in this list. It is not a game: it is a portfolio, with no casino loop and a personal brand.
- **Use:** as a rendering and feel reference, or lift its physics-driving and scene tech into an original "ball launch" round.
- **Risks:** do **not** ship his branding or scene as-is, because that would impersonate a real person.
- **Feasibility:** Low-Medium.

### 10. mgerdes/Open-Golf — cross-platform minigolf in C
- **URL:** https://github.com/mgerdes/Open-Golf · HTML build https://mgerdes.github.io/minigolf.html
- **Stats:** 1,933★ · last commit 2022-03-25 (not maintained)
- **License:** MIT. It uses Kenney nature-kit models, with a separate `data/models/nature_kit/License.txt`.
- **Stack:** C, sokol, Emscripten web build, lightmapped terrain, in-game editor.
- **Why:** it is the most polished open-source minigolf.
- **Risks:** abandoned; to reach the SDK bridge you have to edit C/Emscripten and add JS interop.
- **Feasibility:** Low.

### 11. henshmi/Classic-Pool-Game — 2D 8-ball
- **URL:** https://github.com/henshmi/Classic-Pool-Game · demo https://henshmi.github.io/Classic-Pool-Game/
- **Stats:** 292★ · last commit 2020-02-07 (abandoned)
- **License:** MIT; sprite and sound provenance not stated.
- **Stack:** vanilla JS canvas; there is also a TS port, `henshmi/Classic-8-Ball-Pool` (72★, 2023).
- **Use:** the MIT fallback if the GPL on #1 is a blocker. It is simple enough to add outcome-bucketed replays in a day.
- **Feasibility:** High; Premium: Low-Medium.

### 12. OpenBubbles/OpenPigeon — actual GamePigeon reimplementation
- **URL:** https://github.com/OpenBubbles/OpenPigeon
- **Stats:** 69★ · last commit 2026-09-21 · 100+ commits in 2026
- **License:** **PolyForm Shield 1.0.0** (source-available; you may not compete with OpenPigeon).
  - Assets are under LICENSE-ASSETS and **may not be redistributed**.
  - "OpenPigeon" is a trademark.
  - Releases up to the `v1-final-agpl` tag are AGPL-3.0.
- **Stack:** Kotlin / Android, not web.
- **What it is:** 25 games: 8/9-ball, archery, basketball, cup pong, darts, knockout, mini golf, sea battle, shuffleboard, tanks, word hunt, and more.
- **Use:** **reference only** for rules, feel and scoring. Do not fork for the web.
- **Feasibility:** N/A.

### 13. Clariity/react-chessboard + nmrugg/stockfish.js — chess vs computer
- **URLs and stats:**
  - https://github.com/Clariity/react-chessboard: 545★, last commit 2026-08-16, MIT
  - https://github.com/nmrugg/stockfish.js: 1,201★, last commit 2026-09-15, **GPL-3.0**
  - Alternative UI: lichess-org/chessground, 1,370★, 2026-09-16, **GPL-3.0**
- **Casino round:** "Blunder Bet". The VRF chooses the engine's skill and depth per move, and the player bets on the result band.
- **Risks:** ChessChuck (#20) already exists; the GPL engine.
- **Feasibility:** Medium; Novelty: Low.

### 14. michaelkolesidis/cherry-charm — 3D slot machine (R3F)
- **URL:** https://github.com/michaelkolesidis/cherry-charm
- **Stats:** 84★ · last commit 2026-06-13 · 15 commits in 2026
- **License:** **AGPL-3.0** (the README requires the whole project to be released under AGPL).
- **Stack:** React, react-three-fiber, TypeScript.
- **Use:** reference for 3D reel animation only. The license is strong copyleft, and slots are crowded in the jam (STARFORGE, Jitter Jackpot).
- **Feasibility:** Medium; License: problematic.

### 15. carlomigueldy/cinematic-8ball-pool — cinematic three.js 8-ball
- **URL:** https://github.com/carlomigueldy/cinematic-8ball-pool · https://cinematic-8ball-pool.vercel.app
- **Stats:** 0★ · last commit 2026-07-08
- **License:** **none** (all rights reserved)
- **Stack:** three.js, TypeScript, Vite. It has bloom and filmic tone mapping, full 8-ball rules, and deterministic fixed-step QA hooks.
- **Use:** only with the author's written permission. The visuals are a good reference.

### 16. hunkim/3D_Archers — "Archer's Peak" three.js archery
- **URL:** https://github.com/hunkim/3D_Archers · https://solar-open2-archers.vercel.app
- **Stats:** 0★ · last commit 2026-07-06
- **License:** **none**
- **What it is:** a parabolic arrow, 5-ring scoring, combos, a 60-second time attack.
- **Casino round:** "Wind Bet". The VRF sets the wind and the ring hit, and the arrow replays the result. The archery mechanic fits well.
- **Use:** reference only unless the author grants a license. No archery entry exists in the jam.

### 17. willc/tank-wars — Scorched-Earth in one HTML file
- **URL:** https://github.com/willc/tank-wars
- **Stats:** 0★ · last commit 2026-07-13 · 13 commits in 2026
- **License:** **none**
- **What it is:** 2–8 players with AI, 24 weapons, wind, a shop, and music.
- **Casino round:** the VRF sets the wind and the hit result. This is the most natural "VRF supplies the wind" game.
- **Use:** ask the author, or rebuild the mechanic in LittleJS (#4).

### 18. crusadesoft/openartillery — multiplayer artillery (Colyseus)
- **URL:** https://github.com/crusadesoft/openartillery · https://openartillery.net
- **Stats:** 0★ · last commit 2026-04-28
- **License:** **proprietary.** The LICENSE says "All rights reserved… no license… to modify".
- **Verdict:** **do not use.** It is listed only because it looks open source.

### 19. Kevin-Liu-01/Claude-of-Tanks — three.js armored combat sim
- **URL:** https://github.com/Kevin-Liu-01/Claude-of-Tanks
- **Stats:** 437★ · last commit 2026-09-25 · 100+ commits in 2026
- **License:** MIT *by default*, but `LICENSE-POLICY.md` reserves `src/vehicles/**`, `src/world/**`, `public/audio/**`, `public/brand/**`, `public/fx/**` and `public/maps/**` under a **Proprietary-Content-License**. The name also uses a third-party trademark.
- **Verdict:** impressive, but the fun parts (vehicles, maps, audio) are not reusable. Reference only.

### 20. rune/rune — multiplayer web-game SDK examples
- **URL:** https://github.com/rune/rune
- **Stats:** 424★ · last commit 2026-08-27 · 6 commits in 2026
- **License:** MIT
- **Examples:** tic-tac-toe, Outmatched, sudoku, Pinpoint, OinkOink, Paddle, Cube Rush, Neon Snake.
- **Use:** small, clean multiplayer game loops you can mine for UI and flow. The examples are casual, not premium.
- **Feasibility:** Medium.

### 21. godotengine/godot-demo-projects
- **URL:** https://github.com/godotengine/godot-demo-projects
- **Stats:** 9,567★ · last commit 2026-09-25 · 42 commits in 2026
- **License:** MIT
- **Use:** physics, pong and 3D demos. Combine them with Kenney CC0 packs (#3) to reach a GamePigeon-style game such as bowling, cup pong or darts.
- **Feasibility:** Medium.

### 22. MikhaD/wordle — Wordle plus extra modes
- **URL:** https://github.com/MikhaD/wordle
- **Stats:** 286★ · last commit 2026-04-05 · 5 commits in 2026
- **License:** **GPL-3.0**
- **Stack:** Svelte, TypeScript.
- **Casino fit:** weak. Guessing is skill, so an honest VRF round needs an auto-solver or a "letters revealed" bet.
- **Feasibility:** Medium; Fit: Low.

### 23. letsuno/uno-online — multiplayer UNO
- **URL:** https://github.com/letsuno/uno-online
- **Stats:** 26★ · last commit 2026-09-01 · 100+ commits in 2026
- **License:** **AGPL-3.0**
- **Verdict:** active, but it is a card-game classic with AGPL and the UNO trademark. Not recommended.

### 24. kbennett2000/lan-games — 8 LAN board games
- **URL:** https://github.com/kbennett2000/lan-games
- **Stats:** 16★ · last commit 2026-06-22 · 90 commits in 2026
- **License:** MIT
- **Games:** Monopoly, Risk, Battleship, and others; plain visuals.
- **Verdict:** Battleship already exists in the jam (#47). Low value.

### 25. Reference engines (MIT or Apache, all maintained in 2026)
- **mrdoob/three.js:** 115,867★, 2026-09-25
- **phaserjs/phaser:** 40,357★, pushed 2026-08-21
- **liabru/matter-js:** 18,431★, 2026-09-24
- **dimforge/rapier.js:** 697★, Apache-2.0, 2026-07-12. Deterministic physics, good for bucketed replays.
- **pmndrs/react-three-fiber:** 32,476★, 2026-09-24

### Considered and rejected (verified)
- **pmndrs/racing-game:** 2,220★, MIT, last push 2023-02. Abandoned.
- **gabrielecirulli/2048:** 13.4k★, MIT, last commit 2024-10. Dormant, and 2048 is not casino-shaped.
- **Hextris/hextris:** 2,439★, NOASSERTION, 2023. Dormant.
- **BKcore/HexGL:** 1,741★, MIT, 2024. Racing; dormant.
- **vpdb/vpx-js:** browser pinball, GPL-2.0, last commit 2020.
- **FaridSafi/react-native-basketball:** 572★, MIT, last commit 2017.
- **jaks6/WebGL-Billiards:** 52★, no license, 2015.
- **lettier/webglbowling:** 30★, no license, 2014.
- **notchris/mini-golf-3d:** 14★, GPL-3.0, 2023.
- **Plinko and Stake-style clones:** AnsonH/plinko-game (125★, no license), tanh1c/stake-originals-clone (35★, no license). **Banned genre** under the jam rules.
- **scribble-rs/scribble.rs:** 662★, BSD-3, active. Pictionary; no honest VRF outcome loop.
- **openfrontio/OpenFrontIO:** 2,730★, **AGPL-3.0**, active. An RTS, far too large for a 2.5-day jam.

---

## Licensing cheat-sheet

The deal assumes commercial use with a revenue share, and source shared with the organizers.

- **Safe (permissive code; assets clearly licensed):**
  - Kenney kits (MIT + CC0)
  - LittleJS (MIT; build your own art or use Kenney CC0)
  - folio-2025 (MIT, CC0 music; but do not reuse the personal branding)
  - SlashSaber (CC-BY-4.0, attribution)
  - SYNTHBLAST (Apache-2.0)
  - Open-Golf (MIT, with the Kenney license file)
- **Permissive code, asset provenance unclear:**
  - LCmaster/minigolf
  - iamkun/tower_game
  - henshmi/Classic-Pool-Game
  - Replace or confirm the art and audio before any commercial deal.
- **Copyleft (allowed, but the whole frontend becomes GPL/AGPL and the source must be published):**
  - tailuge/billiards (GPL-3.0)
  - stockfish.js and chessground (GPL-3.0)
  - MikhaD/wordle (GPL-3.0)
  - cherry-charm and uno-online (AGPL-3.0)
- **Do not fork:**
  - openartillery (proprietary)
  - OpenPigeon (PolyForm Shield, assets not redistributable, trademark)
  - Claude-of-Tanks reserved content
  - Any "no license" repo (cinematic-8ball-pool, 3D_Archers, tank-wars) without written permission

## Recommendation for the jam

1. **Ambitious and premium:** fork **tailuge/billiards** and build "Break Bet" on its break record/playback, with an offline bucketed break library chosen by the VRF. Accept the GPL-3.0 on the frontend. No pool entry exists yet.
2. **License-clean and original:** use **LittleJS + Box2D + Kenney CC0 audio** to build a GamePigeon-style **Cup Pong** or **Darts** round. The VRF picks the cup or ring, and a deterministic replay shows the throw. It is fully yours, and neither genre is in the jam.
3. **Middle path:** **LCmaster/minigolf**, an MIT 3D minigolf with Rapier. Build an "Ace It" hole-in-one bet from bucketed putt replays, after confirming the asset provenance with the author.
