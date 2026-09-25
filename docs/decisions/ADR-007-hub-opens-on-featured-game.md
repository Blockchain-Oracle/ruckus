# ADR-007: The hub opens on the featured game

**Status:** accepted (2026-09-25, session 3, judge-eye pass)

## Context
With no `?game=` deep link, the hub opened on `WelcomeScene`: four primitive arcade cabinets with blank glowing screens. Only Chickenz is shipped, so a first-time visitor (a judge) saw three empty machines and a headline over them. That reads as unfinished, and it hides the strongest thing we have: a live 4-bot Chickenz exhibition.

## Decision
- No deep link → select the first visible game (`visibleGames()[0]`), so the page opens on its live attract with Play / Online / Back a Bird.
- The hub's Back button and the cabinet picker only show when two or more games are visible (a picker of one repeats the headline).
- On tall (portrait) screens the attract camera pulls back to fit the scene's width and lifts it above the stacked menu; the sideways lens shift is landscape-only.
- Chickenz asks upright phones to turn sideways during play ("Play anyway" dismisses it for the visit).

## Consequences
- `WelcomeScene` is now only a loading backdrop. When Pool/Soccer/Runner ship, the welcome room must be rebuilt with cabinets that show each game's real attract (render targets or key art), never blank screens; until then it stays out of sight.
