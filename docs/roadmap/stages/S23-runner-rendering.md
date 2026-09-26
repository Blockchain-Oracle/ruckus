# S23 Runner rendering + assets

**Goal:** Neon Dash is playable against bots at reference fidelity:
- DAG Dasher's neon night road and barrier grammar, with authored animated runners
- same-seed ghost racing
- the HUD, keys and swipes
- ElevenLabs SFX and music

**Read first:** docs/research/deep/kaspakinesis.md, ADR-001/003/004/006, PLAN §6b, docs/research/deep/asset-sources.md, `packages/sim-runner/src/*`

## Design calls (session 5)
- **Name: Neon Dash** (a nod to DAG Dasher).
- **Floating origin.** The focus runner (you, or the lead bot behind the hub menu) always sits at z = 0 and the road streams past. A 3 km course never strains float precision, and the hub's static attract orbit just works.
- **World: DAG Dasher's look, crafted.** The reference is primitive-only neon (§4). We keep its palette, grid road, teal/purple lane dividers, pulsing edge lights, fog 30→150 and night skyline, and build it procedurally:
  - instanced towers with generated window facades and neon crowns
  - a far skyline strip
  - We didn't use a city kit: the neon silhouette is the reference's identity, and procedural keeps phones fast.
- **Barriers keep the colour-is-the-verb grammar with a silhouette per verb:**
  - hurdle = jump
  - overhead bar on posts = duck
  - tall wall = move
  - raised block = strict duck
  - A glass slab covers the sim's exact body band, plus a bright frame and a white glyph on a dark outline. They pulse 0.3 + 0.1·sin 8t (KK).
- **Runners: Quaternius's CC0 mannequin** with 14 clips merged from Universal Animation Library 1 + 2 (`packages/assets-pipeline/src/runner-character.ts`, 510 KB). It's tinted in the hub's four player colours.
  - **You are solid.** Rivals are additive holograms that fade as they near you, or when they sit between you and the camera (the Mario Kart ghost rule).
  - Clips follow sim state: idle, sprint (cadence follows speed), jump start/air, slide, roll after a slam, hit, wipeout.
  - At the finish they coast to a stop, turn to the camera and dance.
- **Feel:**
  - course-anchored sparks (hits, wipeouts, pickups, hard landings, coin glints)
  - trauma shake on the camera pose
  - speed lines above 27 m/s and during a boost
  - lane glide with lean
  - flicker while invulnerable
  - red/green edge flashes for hits and shield saves
  - the Fog debuff pulls the scene fog in to 5→35 m
- **Controls (the user's rule):**
  - Keys: A/D ←/→, W/↑/Space jump, hold S/↓ duck.
  - Touch: swipes that fire mid-gesture (KK waited for touchend), with swipe down = a 0.48 s duck.
  - Taps that go down and up between ticks are latched.
  - A How to play card before the first race, a ? button during races, and a key/swipe hint for the first 18 s.
- **Camera** rides behind you, following your lane and height. It drops back with speed, and backs off on narrow aspects so three lanes always fit (KK widened its FOV in portrait).
- **Audio:**
  - 17 ElevenLabs SFX. Coins climb a scale when taken in a run.
  - Ghosts' sounds sit 16 dB under yours.
  - A wind loop bed and the synthwave chase theme.

## Tasks
- [x] Character pipeline (itch fetch script + gltf-transform merge/prune/resample/meshopt)
- [x] Driver: fixed 60 Hz accumulator, interpolation, exhibition/race/online modes, snapshot reconcile
- [x] Road, city, skyline, finish gantry; barriers; coins, pickups, platforms; runners; sparks; speed lines
- [x] HUD: progress rail, coins + momentum + km/h, power chip, live standings, call-outs, flashes, results board, How to play, settings (bot level, ghosts on/off)
- [x] Input: keys + swipes
- [x] Audio: SFX sprite, wind bed, chase music
- [x] Hub: registry entry (visible), tagline, credits
- [x] Verify: screenshots at 1280×720, 844×390 touch, 390×844 portrait; no console errors; budgets

## Acceptance
- From the hub, Play starts a 3 km race against three bots: countdown, GO!, FINISH!, a results board and Race again.
- Every control is written on screen.
- Sound and music play.
- Attract shows a live four-bot race.
- Check with `tooling/browser-checks/src/runner-shots.ts` (`RUNNER_TOUCH=1`, `RUNNER_INTRO=1`).

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
