# Product requirements (from the user, running list)

## Concept
- A multiplayer **arena game hub** built from four references:
  - **Chickenz**: full-fidelity design and flow, generalized to **4-player FFA**.
  - **8-ball pool**.
  - **Eggy League**: actually a 2D head-soccer game, not Rocket League.
  - **KaspaKinesis**: really DAG Dasher, a 3-lane runner, rebuilt as a same-seed ghost race.
- Take UX-flow inspiration from **xray.games** (live game floating behind menus, easy practice mode), but not its visual design.
- Multiplayer first, but also single-player: create/join rooms, share links with friends, play with friends AND bots in the same match, quick play, tournaments.
- Bots are classic game AI (no LLM APIs). They are deterministic and **always labelled**. No fake rooms and no disguised bots.
- **No voice chat.** The user linked the KaspaKinesis `voice` branch only because it had more commits. Use quick-chat emotes instead.
- **Every game in the arena must be multiplayer**, even if the reference game is solo. Design a multiplayer form for each (see the patterns in the plan), researched rather than bolted on.
- Wager moments settle through the Chain casino SDK (VRF); the free arena doubles as the standalone demo.

## Onboarding: every game in the arena (the user's favourite thing about Chickenz)
- **Hands-on guided tutorial first, not a "how to play" text screen.** Drop the player straight into the game and teach by doing: "move left/right" → "jump" → "double jump" → "pick up a weapon" → "shoot" → … → "Good luck!".
- Reference implementation: `references/chickenz/apps/client/src/tutorial/Tutorial.ts:35-70` (8 steps on a local WASM sim, no network, yellow prompt box top-center), first-visit modal "LOOKS LIKE YOU'RE NEW HERE" [PLAY TUTORIAL]/[SKIP].
- **Then username** (auto-generated guest name like `Fox4821`, editable) → "LET'S GO!" → lobby.
- Lobby has **Quick Play** front and centre, plus create public/private room, join by code, tournament, replay tutorial.
- Each mini-game gets its own equivalent hands-on tutorial (pool: aim → power → spin → pot a ball; soccer: drive → jump → boost → score; etc.).

## Zero friction
- No wallet connect or sign-in before playing. Guest identity auto-created locally; leaderboard works immediately; sign in later to keep points.

## Quality bar
- UX, sound, motion and physics feel are the product. No AI slop. No lag: performance is non-negotiable.
- Use Three.js where 3D is needed; best-in-class libraries, researched and understood (read the docs).
- Use 21st.dev CLI/skills for UI components.
- Tests only for complex logic (payout math, physics determinism, netcode), not the UI.
- The deadline is not a reason to cut quality.

## Assets (added 2026-09-25)
- **Shared brand, native game styles.** One hub identity (palette, fonts, buttons, sounds, transitions, celebrations) wraps each game's native look.
- **Licensing:** only licences valid for real-money gambling products, all logged in `docs/CREDITS.md`.
- **Paid asset packs are OK** where they clearly raise quality, and free trials are welcome. The user approves each purchase.
- **ElevenLabs:** the user has a paid Starter plan. It can't be used for this product until ElevenLabs confirms in writing (see `docs/assets/elevenlabs-request.md`).
- **Workflow:** work in stages with an on-disk handoff (`docs/roadmap/`), so any session can resume after a context clear.
