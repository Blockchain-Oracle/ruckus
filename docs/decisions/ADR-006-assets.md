# ADR-006: Assets: art direction, source policy, pipeline

- Status: accepted (2026-09-25)

## Art direction (the owner's choice)
- **One shared brand** wraps everything: the hub and the casino layer share one palette, a display font plus a body font, chunky press buttons, Phosphor icons, transitions, sound language and payout celebrations.
- **Each game keeps its native style:**
  - Chickenz: pixel art
  - Pool: cinematic 3D
  - Soccer: cartoon drawn in code
  - Runner: stylized low-poly 3D
- Gold is reserved for money. No emoji icons, no spinners, no Inter-everywhere.
- The brand was chosen from three explored directions and written into `docs/assets/ART-BIBLE.md`.

## Source policy
- **Allowed:** licences that permit commercial use in real-money gambling products. That means CC0, royalty-free with no gambling exclusion, or work we own.
- **Banned:**
  - NC, SA, GPL or otherwise ambiguous licences.
  - Chickenz's original music (NCS), guns, logo and taunt clips.
  - Jestan's weapons pack.
  - Udio.
  - Stock-music plans that gate game use behind enterprise terms (Epidemic, Artlist), and Uppbeat.
- **ElevenLabs is the primary source for SFX and music** (we decided this on 2026-09-25, on their paid Starter plan).
  - Tools: the `sound-effects` and `music` skills, or the `elevenlabs` CLI 1.4.0 (`elevenlabs text-to-sound-effects convert --json '{...}' -o <file>`).
  - Budget: 39,855 credits per month (a 1 s SFX costs 40 credits; music costs 900 per minute).
  - Keep every take in `assets-src/<game>/{sfx,music}/`, and log the prompt, model and date in `docs/assets/<game>.md`.
  - Library sounds (Kenney CC0, Silverplatter, Sonniss) are for layering and fill-in.
- **Every asset** gets a row in `docs/CREDITS.md` and an entry in the in-game credits screen.
- **Raw sources** live in `assets-src/<game>/` and are committed. The exception is sources whose licence restricts redistribution (Sonniss WAVs): those go in `assets-src/**/restricted/`, which is gitignored.

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
Each game's asset manifest (`docs/assets/<game>.md`) is written at the start of that game's rendering stage.
