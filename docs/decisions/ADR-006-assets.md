# ADR-006: Assets: art direction, source policy, pipeline

- Status: accepted (2026-09-25)

## Art direction (the user's choice)
- **One shared brand** wraps everything: the hub and the casino layer share one palette, a display font plus a body font, chunky press buttons, Phosphor icons, transitions, sound language and payout celebrations.
- **Each game keeps its native style:**
  - Chickenz: pixel art
  - Pool: cinematic 3D
  - Soccer: cartoon drawn in code
  - Runner: stylized low-poly 3D
- Gold is reserved for money. No emoji icons, no spinners, no Inter-everywhere.
- The brand is decided at checkpoint ✱N (S03) using the 21st-ui-explore skill, and written into `docs/assets/ART-BIBLE.md`.

## Source policy
- **Allowed:** licences that permit commercial use in real-money gambling products. That means CC0, royalty-free with no gambling exclusion, or work we own.
- **Banned:**
  - NC, SA, GPL or otherwise ambiguous licences.
  - Chickenz's original music (NCS), guns, logo and taunt clips.
  - Jestan's weapons pack.
  - Udio.
  - Stock-music plans that gate game use behind enterprise terms (Epidemic, Artlist), and Uppbeat.
- **ElevenLabs is pending written clarification.**
  - Its Prohibited Use Policy §3(c) bans "facilitat[ing] real-money gambling activities" and applies to outputs.
  - We do not reword prompts to get around the policy.
  - The request draft is in `docs/assets/elevenlabs-request.md`. If they approve, we use the `sound-effects` and `music` skills on the Starter plan (39,855 credits per month).
- **Every asset** gets a row in `docs/CREDITS.md` and an entry in the in-game credits screen.
- **Raw sources whose licence restricts redistribution** (Sonniss WAVs) live in the gitignored `assets-src/`. Only processed output is committed.

## Pipeline (`packages/assets-pipeline`, built in S03)
- **Flow:** `assets-src/<game>/` → scripts → `apps/web/public/assets/<game>/`. Output is committed, with Git LFS for binaries over 1 MB and LFS enabled on Vercel.
- **Sprites:** `@assetpack/core` atlases, using NearestFilter and 1–2 px extrude for pixel art.
- **3D:** `gltf-transform optimize --compress meshopt --texture-compress ktx2`. This needs KTX-Software `toktx`. Use UASTC for normal and ORM maps, ETC1S for base colour.
- **Audio:**
  - Opus in WebM first, AAC `.m4a` as the fallback.
  - About −16 LUFS integrated, with a master limiter.
  - SFX go in one audio sprite per game. Music stems stream.
- **Fonts:** subset to woff2 with `pyftsubset`.
- **Naming:** `<game>/<category>/<name>[_<variant>][@<scale>].<ext>`, in kebab-case.
- **Size budgets:** attract mode ≤1.5 MB per game; a full game chunk ≤8 MB. CI enforces both.

## Inventory
See `docs/roadmap/PLAN.md` §6b for the per-game table. Each game's manifest (`docs/assets/<game>.md`) is written at the start of that game's rendering stage.
