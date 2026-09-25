# Credits & licence ledger

Every third-party asset or code source used in the product gets a row. Mirror attribution-required rows on the in-game credits screen. Policy: `docs/decisions/ADR-006-assets.md`.

## Code
| What | Source | Licence | Used in | Notes |
|---|---|---|---|---|
| Chickenz fixed-point sim, bot AI (ported), prediction/camera/ragdoll patterns | https://github.com/AshFrancis/chickenz | MIT | `crates/chickenz-sim`, `apps/web/src/games/chickenz` | Keep MIT notice in `crates/chickenz-sim/NOTICE` |
| Chain casino SDK (vendored) | https://sdk.chain.wtf/casino | Provided by Chain.wtf for jam entrants | `packages/chain-casino-sdk` | Verbatim copy, synced by `pnpm sync:sdk` |
| pooltool (physics reference port) | https://github.com/ekiefl/pooltool | Apache-2.0 | `packages/sim-pool` (Stage D) | Attribution + NOTICE required |

## Art
| Asset | Source | Licence | Price | Date | Used in |
|---|---|---|---|---|---|
| _(filled per game at its rendering stage)_ | | | | | |

## Audio
| Asset | Source | Licence | Price | Date | Used in |
|---|---|---|---|---|---|
| _(filled per game at its feel stage)_ | | | | | |

## Fonts
| Font | Source | Licence |
|---|---|---|
| _(set at ✱N brand checkpoint)_ | Google Fonts | OFL / Apache-2.0 (ship licence text) |

## Purchases (receipts)
| Date | Item | Price | Receipt location |
|---|---|---|---|
