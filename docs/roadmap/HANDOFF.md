# HANDOFF (updated 2026-09-25 by session 1)

**Stage:** S00b is done. Now on **S01 Casino core**, step 1. [stages/S01-casino-core.md](stages/S01-casino-core.md)

**Last completed:**
- The name is **RUCKUS**. The contract is `RuckusGame`, so the gameId is `ruckus`.
- The private repo https://github.com/Blockchain-Oracle/ruckus is pushed.
- ElevenLabs is set up as the primary source for sound effects and music: CLI 1.4.0 installed, and a smoke-test sound effect generated.

**NEXT ACTION:** S01 task 1: run `cd casino-sdk && npm install && npm start` in the background, and check that :3300 serves the harness and coinflip settles.

**Uncommitted work:** none.

**Blocked on the user:** nothing.

**Environment state:**
- The simulator isn't running yet (S01: `cd casino-sdk && npm install && npm start` → :3300, chain :8545).
- There are no contract, Convex, server or Vercel URLs yet.
- Branch `main` tracks `origin` (GitHub).
- Local toolchain:
  - node 25.9.0 (CI uses 24)
  - pnpm 11.24 (the repo pins 10.x)
  - rustc 1.98.1 with the wasm32 target
  - Foundry, the 21st CLI and `elevenlabs` CLI 1.4.0
- **wasm-pack is not installed.** S06 needs it.
- ElevenLabs: Starter plan, about 39.8k credits; the key is in `ELEVENLABS_API_KEY`. Generate with `elevenlabs text-to-sound-effects convert --json '{"text":…,"duration_seconds":…,"prompt_influence":…,"model_id":"eleven_text_to_sound_v2"}' -o assets-src/<game>/sfx/<name>.mp3`. Log every take in `docs/assets/<game>.md`.

**Last green verification:** CI is green on GitHub (check, typecheck, test). Locally, `pnpm build` for web and server works. Earlier: the ElevenLabs SFX smoke test gave `assets-src/chickenz/sfx/jump_v1.mp3` (44.1 kHz stereo).

**Gotchas learned:**
- Pin pnpm 10.x, because Nixpacks only supports pnpm 6–10.
- Pin Node 24.21.0, because 24.12.4 doesn't exist.
- Biome plugin globs need a `**/` prefix.
- tsdown needs `fixedExtension: false` to emit `dist/index.js`.
- The Coolify Base Directory must be `/`.
- Keep `casino-sdk/` out of the pnpm workspace.
- `references/` is gitignored.
- The Chickenz README is wrong in places. Trust `docs/research/deep/chickenz.md`.
- The user doesn't want the ElevenLabs policy raised again. Just use it.

**New ADRs:** ADR-001 to ADR-006.

**Research to read before resuming:** only the "Read first" list in S00b.

**Deadline status:** the site closes submissions on Sun Sep 27 at 23:59 UTC. The user doesn't want quality cut for it. An early eligible slice is planned at ✱E. **Submitted build:** none.
