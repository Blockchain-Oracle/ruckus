# S18 Soccer rendering + assets

**Goal:** Soccer is playable against bots at reference fidelity. Code-drawn egg characters with squash/stretch and eye tracking, a night stadium, the HUD, keys and touch controls, and ElevenLabs sound and music.

**Read first:** docs/research/deep/eggy-league.md, ADR-001/003/004/006, PLAN §6b, docs/research/deep/asset-sources.md, `packages/sim-soccer/src/*`

## Design calls (session 4)
- **Toon-lit 3D diorama with a 2D side-view camera.** The play plane is z = 0, and 1 world unit = 100 sim px. The attract orbit reveals depth: stands, floodlight towers and goal nets. It isn't a flat sprite game, so it sits beside Pool's cinematic table and Chickenz's pixel diorama in the same WebGPU shell.
- **Eggs are code-drawn.**
  - Body: a lathe egg profile with a 3-tone toon gradient and an inverted-hull outline.
  - Eyes: big eyes whose pupils track the ball, plus a deterministic blink.
  - Two little boots that cycle while running.
  - A team kit band.
  - Squash/stretch comes from a spring driven by landings and take-offs.
  - Freeze shows as an ice shell, speed as trail ghosts, grow/shrink as scale.
- **Football:** a procedural truncated-icosahedron texture (Voronoi of 12 pentagon and 20 hexagon centres) that rolls with the ball's travel.
- **Kits:** team 0 is Tomato, team 1 is Violet (the hub's player-1 and player-3 colours). A 2v2 partner wears a lighter shade and a headband.
- **Feel:**
  - Kicks and posts add trauma: the stage group shakes, never the camera rig.
  - A goal adds ~0.5 s of slow motion, confetti in the scorer's colours, a crowd roar, stands that jump, and a net bulge.
- **Flow:** the sim already owns kickoff (3 s freeze) and the goal pause. The HUD derives 3-2-1-GO from `phaseTicks`, so online play (S19) presents identically.
- **Settings:** a format toggle (1v1 / 2v2 with a bot partner) and bot level (Rookie / Pro / Legend), stored per viewer.
- **Controls (the user's rule):**
  - Nothing fights the pointer.
  - A How to play card is open on first visit and one tap away afterwards.
  - A bottom hint during the first match.
  - Touch gets ◀ ▶ buttons on the left and a big JUMP on the right.

## Tasks
- [x] Driver: fixed 60 Hz accumulator over `@arena/sim-soccer`, render interpolation, exhibition (2v2 bots, loops) and practice match modes, event queue, slow-mo.
- [x] Stadium: grass with mowing stripes, touchlines, LED ad boards, tiered stands with an instanced reactive crowd, floodlight towers with glows, night sky, wall panes.
- [x] Goals: posts, crossbar, depth net with bulge on goal.
- [x] Eggs: toon body, outline, eyes tracking the ball, blink, boots, kit, squash/stretch, power-up looks.
- [x] Ball: procedural football texture, rolling, shadow blob; power-up bubbles with drawn icons.
- [x] Effects: kick puffs, goal confetti, trauma shake.
- [x] HUD: score bug + clock, power-up chips, 3-2-1-GO, GOAL!, full-time results, leave, settings, fullscreen, How to play card.
- [x] Input: keys (A/D ←/→ move; W/↑/Space jump), touch buttons.
- [x] Audio: ElevenLabs SFX sprite + stadium anthem; crowd bed; event mapping with pan.
- [x] Hub: registry entry, tagline, Settings section; camera rig with the width-fit follow.
- [x] Verify: `pnpm verify`, then play in the browser (1v1, 2v2, touch emulation, portrait).

## Notes (session 4)
- **Camera:** it uses the rig's `pose` rather than `follow`. `follow` forces a level camera, which made the grass a thin strip. The pose rises 2.4 units and looks down; it pulls back until the pitch width fits the aspect, and lifts for high balls.
- **Stage shake:** it moves the scene's stage group (the SoccerFx trauma), never the camera rig.
- **Screenshots:** `tooling/browser-checks/src/soccer-shots.ts` (`SOCCER_TOUCH=1`, `SOCCER_2V2=1`) takes attract, countdown and in-play shots, and prints the world state.
- **Verified:** 1280×720 desktop and 844×390 touch (2v2), with no console errors.
- **Shell budget:** raised from 150 to 155 KB. It was already at 150.0 KB before Soccer, and the tile adds 0.2 KB. Auditing the growth during Pool is a follow-up.
- **Sounds to listen for:** `soccer.bounce~2` is 54 ms and `soccer.post` is short. Regenerate them if they sound clipped.

## Acceptance
- From the hub, Play starts a 90 s match vs a bot with countdown, goals, a full-time card and rematch.
- Every control is written on screen.
- Sound and music play.
- Attract shows a live 2v2 bot exhibition.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
