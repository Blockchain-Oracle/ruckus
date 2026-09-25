# Eggy League: deep research

1st place, PlaySolana **Matrix Hackathon**, MagicBlock track (announced 2026-03-06 by @magicblock and @EggyLeague).

## TL;DR

- **The game's own repo is not public.** GitHub repo, code and user searches for "eggy league", "eggy soccer", and the team's accounts turn up no game repo. The shipped game is a **Unity** client for the PSG1 handheld, and now also for Solana Seeker.
- **The closest public code is by the team's backend dev.** It is `IVSOP/DeFORM` (Ivan Ribeiro's master's-thesis library, Rust). It contains `crates/examples/soccer`: a Bevy port of **Eggy League's core physics and rules**. The source says "Arena geometry (from Eggy League, units are game-pixels)". It includes an on-chain lobby/tick program that runs on MagicBlock Ephemeral Rollups. No license file (all rights reserved by default); last push 2026-09-21; 1 star.
- **It is not a Rocket League-style game.** It is a **2D side-view "Head Soccer" / "Soccer Heads" clone**: big round egg heads, run and jump, no kick button. There are no cars and no "boost" meter. "Boost" is a **Speed Boost power-up**.
- **The team moved real-time play off-chain after the hackathon.** In the AMA they said MagicBlock ER gave about **600 ms latency**, so live play moved off the chain. Lobbies, stakes and the shop stay on-chain.

## Identity

| | |
|---|---|
| Name | Eggy League |
| Live site | https://eggy.playsolana.com (marketing and leaderboard; the game itself runs on PSG1 and Seeker, not in the browser) |
| X | @EggyLeague (the site footer also links @eggyplay) |
| Platform | PSG1 handheld (Play Solana), and Seeker phone via the Solana dApp Store |
| Hackathon | PlaySolana Matrix Hackathon, MagicBlock track, 1st place ($3,000 per Ivan's LinkedIn). 2nd place was Timebent. |
| Team | Portuguese, from Universidade do Minho. **Ivan Ribeiro** (GitHub `IVSOP`): backend and blockchain, Rust/Solana/MagicBlock, author of DeFORM. **Pedro**: Unity gameplay and UI/UX, a game-dev master's student and new to web3 (both from the AMA). |
| Inspiration | "Head Soccer" and the "Soccer Heads" flash games from the early 2000s. Planned spin-offs are basketball and volleyball. |
| AMA | YouTube `_TeHKnttD9o`, "Eggy League AMA" (Play Solana, 2026-04-29, 27 min, includes a live gameplay demo) |

## Tech stack

- **Client:** Unity (C#), built for the PSG1's controls and screen. Pedro: "game development with Unity".
- **Hackathon build:**
  - Match simulation ran **fully on-chain on MagicBlock Ephemeral Rollups**. MagicBlock: "Real-time match gameplay runs on Ephemeral Rollups".
  - Solana program for lobbies, stakes and the shop.
  - $PLAY SPL token.
- **Current build:**
  - Real-time play runs on an off-chain authoritative server. They pick a region per lobby, and DeFORM's QUIC backend is the likely successor.
  - Solana still handles lobbies (create, join, leave), $PLAY stakes and shop purchases.
  - Quote: "the biggest challenge… making the entire game onchain and then having to make it off chain because… latencies of like 600 milliseconds with MagicBlock."
- **DeFORM architecture** (`IVSOP/DeFORM`, Rust). This is the best public view of how their on-chain real-time mode works:
  - **The game implements three traits:**
    - `DeformInputs`: `SoccerInputs {horizontal: i8, jump: bool}`. `merge` ORs `jump` so a tap is never lost.
    - `DeformGameState`: `has_ended()`.
    - `DeformUserLogic`: `advance_frame(state, inputs) -> state`, which must be deterministic.
  - **Backends:** Offline (local, with bots), QUIC (Rust server), and FOC (Fully On-Chain, in an ER).
  - **Anchor program instructions:** `create_lobby`, `join_lobby`, `ready`, `start` (delegates the lobby and input PDAs to the ER), `set_inputs` (a batched wincode-encoded `HashMap<tick, Inputs>` per player), `tick`, `write_and_close` (writes final scores and refunds rent), `undelegate`, `process_undelegation`.
  - **`tick` is a MagicBlock scheduled crank with no signer.** It computes `slot_delta × micros_per_slot / TICK_RATE_MICROS` and advances that many sim ticks per call, so the on-chain sim keeps pace with ER slots. Soccer ticks at 20 Hz on-chain (`TICK_RATE_MICROS = 50_000`), with a 60 Hz feature flag.
  - **Netcode:**
    - Client-side prediction with rollback. Only the client rolls back.
    - The authority predicts missing inputs as "repeat last".
    - An **adaptive client tick-rate controller** (tanh speed-up/slow-down on the input-buffer occupancy, ±10%/5%) keeps the input lead minimal.
    - `#[smooth]` derive macros visually smooth corrections on the ball and player positions (decay 0.92, max offset 200).
  - **Client:** Bevy 2D sprites (`SolanaMap.png`, goals, `football.png`, `walk_eggy.png` sprite sheet) plus an egui menu (Play Offline / Solana keypair and airdrop / Create, Join, Ready, Start lobby / Init Crank).

## Gameplay, precisely

From the site, the AMA demo and the DeFORM port.

- **Format:** 1v1 real-time PvP. **90-second** matches; the HUD shows `0 TIME 1:30 0`. Most goals wins, and a draw is possible. (The DeFORM port uses first-to-5 instead.)
- **Arena:** a side-view pitch with walls and a ceiling, and a goal on each side (a crossbar you can bounce off, with the net below). In game-pixels: width 1240 (`±620`), ceiling 864, goal mouth 165 high, crossbar 30 thick, goal 85 deep.
- **Player:** a round egg, radius 43.75.
  - Horizontal speed 250 px/s, set instantly with no acceleration.
  - Jump velocity 750.
  - **Variable jump height:** gravity is −1200 while jump is held and −2000 once it is released while rising. "Tap to jump, hold to jump higher."
  - Maximum fall speed −750. The player faces the direction of the last input.
- **Ball:** radius 21.875. It uses the same gravity. Restitution 0.9 off walls, floor, ceiling and crossbar. Speed is capped at 1000 per axis.
- **Kicking is by body contact:**
  - The ball's velocity is redirected along the contact normal (×0.9), plus a constant pop of +150 up and +20 along its direction of travel.
  - If the player is moving within 45° of the normal, 75% of the player's speed is added.
  - **Ground assist:** when the ball is on the ground and you face it, the contact normal is clamped to at least 45° upward, so running into a ball lifts it.
- **Player vs player:** equal push-apart on overlap. There is no tackling except through power-ups.
- **Phases:** KickOff (3 s freeze), Playing, Goal (2 s of physics with no scoring), then reset. On reset the ball drops from centre (0, 300) and the players respawn at ±300.
- **Goal detection:** the ball is below the crossbar height and crosses past half the goal depth.
- **Controls (PSG1):**
  - Stick or D-pad to move.
  - A to jump, or select in menus.
  - X / Y / B to trigger the three loadout power-ups.
  - L / R to cycle menu dropdowns.
  - **QuickChat:** hold R1 plus a D-pad direction to send an emoji (smile, cry, angry, blink).
- **Power-ups (7):**

  | Power-up | Type |
  |---|---|
  | Speed Boost | positive (green) |
  | Grow Player | positive (green) |
  | Bouncy Ball | neutral (yellow): ball is bouncier and faster off surfaces |
  | Grow Ball | neutral (yellow) |
  | Shrink Ball | neutral (yellow) |
  | Break Legs | negative (red): freezes the opponent for a few seconds |
  | Shrink Player | negative (red) |

  - There are two ways to get them:
    1. **Pitch spawns:** bubbles spawn periodically mid-arena. The effect goes to the **last player who touched the ball** when the ball rolls over a bubble.
    2. **Loadout:** buy power-ups in the shop and equip up to **3**, triggered manually. Negative ones hit the opponent; the rest apply to you.
  - Effects stack. Active effects show with a duration in the top corner.
  - The team admitted it is "a mini pay-to-win system" and that balance is still open.
- **Modes:**
  - **Practice:** singleplayer vs a bot, offline, with no transactions.
  - **Online:** lobby-based PvP.
  - Roadmap: an ML bot, replays, spectating, and XP/levels.
- **Skins / arenas:**
  - Skins: Default (purple), Blue, Red, Yellow, and Jupiter. There are also World Cup nation kits (48 flags).
  - Arenas: Solana Nights, Mountain Pass, Skyline Court.

## Lobby, economy and wagering flow

1. **Create or Join:**
   - Host a lobby by signing a transaction that creates the on-chain lobby account.
   - Or join by numeric **ID** (the AMA used lobbies 1312, 996 and 755), or browse open lobbies.
   - Pick a region for latency.
2. **Loadout and Skin:** equip up to 3 purchased power-ups and a skin.
3. **Ready:** a commitment. Your **$PLAY stake is transferred** and your loadout is locked. Both players must be Ready to unlock Connect.
4. **Connect and play:** a 90 s match.
   - **The winner gets 90% of the combined stake.** For example, stakes of 1,000 and 1,000 pay the winner 1,800.
   - **On a draw, each player is refunded less 10%** (900 each).
   - There is no house; the 10% is an "infrastructure fee".
   - Leaving or disconnecting counts as a loss.
5. **Shop:** power-ups and consumables are bought on-chain with $PLAY. Cosmetics are coming. A "+" button swaps tokens into $PLAY.
6. **Eggy World Cup** (Jun 11 – Jul 19 2026):
   - Scoring: +3 win, +1 per goal scored, +1 per game played, 0 for a draw, −1 per goal conceded, −1 for a loss.
   - Minimum 10 games to qualify.
   - Repeat games against the same opponent count once.
   - The top 10 are reviewed manually.
   - Prizes: $200 / $100 / $50 USDC plus NFTs and a plush toy.
7. **Legal framing:** "skill-based… not a lottery, casino game, betting product". Competition terms are geo-gated.

## Visuals (from site assets and the AMA)

- Chunky cartoon **egg mascots with faces**, flat-shaded with a thick outline. The walk cycle is a sprite sheet.
- Bright arcade UI with a big wordmark, "READY?" countdown and a VS screen of a purple egg against a red egg.
- Neon night-stadium backgrounds ("Solana Nights") plus painted parallax maps.
- Power-up bubbles are colour-coded: red is negative, yellow affects the ball, green is positive.
- Asset URLs are under `https://eggy.playsolana.com/assets/...`: `mascot/eggy.png`, `powerups/items/*.png`, `backgrounds/{solana,mountain,blue}_map.png`, `brand/eggy_league_wordmark.png`, `controls/btn_*.png`, `emojis/*.png`.

## Lessons for our Chain Jam arena game

- **Keep the live match off-chain.** Even the winning MagicBlock-track project abandoned on-chain tick simulation for live play at about 600 ms latency. Put **lobby, stake escrow, settlement and randomness (VRF) on-chain**, and run the match on a deterministic authoritative server (or P2P with rollback), then post results.
- **Head-soccer physics is tiny and deterministic.** The whole sim is about 300 lines (see `soccer_logic.rs`) and is easy to port to TypeScript or fixed-point for verifiable replays. It has variable jump, contact-kick with ground assist, and a ceiling bounce.
- **The power-up design is useful for a casino jam.** Pitch spawns that go to the "last touch" add chaos, and VRF could drive the spawn schedule. A 3-slot loadout gives a sink for the shop.
- **Stake UX:** "Ready = stake transfer + loadout lock", 90% to the winner, draws refunded minus the fee, and a forfeit on disconnect.

## Open-source references

### A. Eggy / head-soccer lineage (closest to the actual game)

| Repo | ⭐ | Last push | License | Notes |
|---|---|---|---|---|
| [IVSOP/DeFORM](https://github.com/IVSOP/DeFORM) | 1 | 2026-09-21 | **none (all rights reserved)** | **The Eggy League physics port by its own dev.** Rust + Bevy, with offline, QUIC and Solana/MagicBlock ER backends, rollback netcode and a bot AI (`soccer_bot`). Read it; don't copy it without permission. |
| [Erik3010/head-soccer](https://github.com/Erik3010/head-soccer) | 2 | 2023-11-01 | none | Vanilla JS + Canvas head soccer vs CPU, with power-ups (ball grow/shrink, ice), sudden death and character select. The best small web reference for structure. |
| [Lukox/Mulitplayer-Head-Soccer](https://github.com/Lukox/Mulitplayer-Head-Soccer) | 3 | 2023-01-24 | none | socket.io server-authoritative head soccer (WIP). |
| [CampfireCoding/Head-Soccer](https://github.com/CampfireCoding/Head-Soccer) | 3 | 2025-06-15 | MIT | Pygame + Pymunk; shows the physics-engine approach. |
| [ad0n1sdllpc/cosmic-clash-2d-unity](https://github.com/ad0n1sdllpc/cosmic-clash-2d-unity) | 3 | 2024-06-12 | none | Unity 2D, Head Soccer / Kung Foot-style. |

### B. Haxball-likes (top-down 2D physics soccer, web multiplayer)

| Repo | ⭐ | Last push | License | Notes |
|---|---|---|---|---|
| [Mati365/Soccer.js](https://github.com/Mati365/Soccer.js) | 71 | 2016-02-07 | none | HTML5 + socket Haxball-like. |
| [erasmo-marin/open-hax](https://github.com/erasmo-marin/open-hax) | 51 | 2018-10-30 | none | Open Haxball clone. |
| [wxyz-abcd/node-haxball](https://github.com/wxyz-abcd/node-haxball) | 63 | 2026-07-17 | MIT | Full Haxball engine API; replay and physics details. |

### C. Rocket League-lite (3D car soccer with boost and jump), in case we go 3D

| Repo | ⭐ | Last push | License | Notes |
|---|---|---|---|---|
| [Aebel-Shajan/Wocket-Weague](https://github.com/Aebel-Shajan/Wocket-Weague) | 5 | 2024-09-30 | MIT | **Three.js + Rapier + TypeScript + Vite** RL clone, live at wocket-weague.vercel.app. Small (about 8 src files), a clean starting point. |
| [ZealanL/RocketSim](https://github.com/ZealanL/RocketSim) | 161 | 2026-09-21 | MIT | C++ reimplementation of Rocket League physics: car, boost, jump, dodge and ball constants. Reference for the "feel" numbers. |
| [roboserg/RoboLeague](https://github.com/roboserg/RoboLeague) | 311 | 2026-09-06 | other | Unity car soccer that replicates RL physics for RL research. |
| [EBonura/nitroxide](https://github.com/EBonura/nitroxide) | 3 | 2026-09-23 | GPL-2.0 | Rust rocket-car soccer for PS1; fixed-point and deterministic. |
| [RLBot/RLBot](https://github.com/RLBot/RLBot) | 618 | 2026-07-08 | MIT | Bot framework with ball-prediction math. |

### D. Building blocks

| Repo | ⭐ | Last push | License | Use |
|---|---|---|---|---|
| [piqnt/planck.js](https://github.com/piqnt/planck.js) | 5,286 | 2026-09-22 | MIT | Box2D in JS, a good fit for a 2D head-soccer sim. |
| [dimforge/rapier.js](https://github.com/dimforge/rapier.js) | 697 | 2026-07-12 | Apache-2.0 | 2D/3D WASM physics with a cross-platform deterministic build (`@dimforge/rapier2d-deterministic`). The repo has migrated upstream. |
| [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) | 1,436 | 2025-11-03 | MIT | Rapier for R3F. |
| [pmndrs/ecctrl](https://github.com/pmndrs/ecctrl) | 798 | 2026-09-06 | MIT | R3F + Rapier character controller (jump, float). |
| [swift502/Sketchbook](https://github.com/swift502/Sketchbook) | 1,753 | 2024-10-10 | MIT | Three.js + cannon vehicles and characters. |
| [colyseus/colyseus](https://github.com/colyseus/colyseus) | 7,319 | 2026-09-24 | MIT | Authoritative Node multiplayer rooms and matchmaking. |

**Recommendation:**
- **Gameplay:** clone Eggy's 2D head-soccer rules. Port about 300 lines of deterministic logic from `DeFORM/crates/examples/soccer/src/soccer_logic.rs`, reimplemented rather than copied because there is no license, into TypeScript with planck.js or custom math.
- **Networking:** Colyseus (server-authoritative), borrowing DeFORM's prediction/rollback ideas.
- **Chain:** escrow and settle on Base with Chain VRF for power-up spawns.
- **If 3D is needed:** fork Wocket-Weague (MIT) and tune it against RocketSim's constants.
