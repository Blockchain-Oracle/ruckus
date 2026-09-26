# ADR-007: The hub opens on the featured game

**Status:** superseded by the arena landing (2026-09-26, session 5). The single-game fallback below still applies whenever only one game is visible.

## Context
With no `?game=` deep link, the hub opened on `WelcomeScene`: four primitive arcade cabinets with blank glowing screens. Only Chickenz is shipped, so a first-time visitor (a judge) saw three empty machines and a headline over them. That reads as unfinished, and it hides the strongest thing we have: a live 4-bot Chickenz exhibition.

## Decision
- No deep link → select the first visible game (`visibleGames()[0]`), so the page opens on its live attract with Play / Online / Back a Bird.
- The hub's Back button and the cabinet picker only show when two or more games are visible (a picker of one repeats the headline).
- On tall (portrait) screens the attract camera pulls back to fit the scene's width and lifts it above the stacked menu; the sideways lens shift is landscape-only.
- Chickenz asks upright phones to turn sideways during play ("Play anyway" dismisses it for the visit).

## Consequences
- `WelcomeScene` is now only a loading backdrop. When Pool/Soccer/Runner ship, the welcome room must be rebuilt with cabinets that show each game's real attract (render targets or key art), never blank screens; until then it stays out of sight.

## Follow-up (user, 2026-09-25)
RUCKUS is an arena of four games. Once Pool, Soccer and Runner are playable, the landing must showcase every game: a real multi-game arena hub with live previews, not a single featured game. Submission (✱E) waits for that.

## Resolution (2026-09-26, session 5): the arena landing
- With no deep link, the hub opens on the **arena landing** (`apps/web/src/app/ArenaLanding.tsx`), titled "Four games. One arena."
  - Every visible game is a cabinet card: **real gameplay footage** of its live attract, its title and tagline, player count, Online, and its VRF round by name.
  - Choosing a card dollies the camera into that game's live attract (Play, Online, the wager). Back returns to the landing.
  - With only one visible game the landing is skipped, as before.
- The footage is recorded from our own builds, never generated:
  - `tooling/browser-checks/src/capture-previews.ts` records each attract with the DOM hidden. The dev-only `?capture` flag centres the subject by dropping the menu's lens shift.
  - `packages/assets-pipeline/src/encode-previews.ts` crops, trims and encodes an 8 s loop per game:
    - VP9 WebM and H.264 MP4, 640×360, soft fades at the loop seam
    - a JPEG poster
    - about 0.1–0.6 MB each
  - Clips load lazily (`preload="none"`), play only on screen, and never play for reduced-motion viewers.
- The landing sits on its own ink gradient, so `WelcomeScene` never shows its blank cabinets.
