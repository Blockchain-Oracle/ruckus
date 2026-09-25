# Credits & licence ledger

Every third-party asset or code source used in the product gets a row. Mirror attribution-required rows on the in-game credits screen. Policy: `docs/decisions/ADR-006-assets.md`.

## Code
| What | Source | Licence | Used in | Notes |
|---|---|---|---|---|
| Chickenz fixed-point sim, bot AI (ported), prediction/camera/ragdoll patterns | https://github.com/AshFrancis/chickenz | MIT | `crates/chickenz-sim`, `apps/web/src/games/chickenz` | MIT notice in `crates/chickenz-sim/NOTICE`; generalised to 4-player FFA, bots ported to Rust |
| Pop Button (adapted into `Button`) | https://21st.dev (tom_ui/pop-button) | 21st.dev community component (MIT-style) | `apps/web/src/ui/Button.tsx` | Restyled to the Art Bible lip language |
| shadcn/ui primitives (dialog, sheet, tabs, slider, switch, sonner) | https://ui.shadcn.com | MIT | `apps/web/src/ui/primitives` | Themed via token aliases |
| Chain casino SDK (vendored) | https://sdk.chain.wtf/casino | Provided by Chain.wtf for jam entrants | `packages/chain-casino-sdk` | Verbatim copy, synced by `pnpm sync:sdk` |
| pooltool (physics reference port) | https://github.com/ekiefl/pooltool | Apache-2.0 | `packages/sim-pool` (Stage D) | Attribution + NOTICE required |

## Art
| Asset | Source | Licence | Price | Date | Used in |
|---|---|---|---|---|---|
| Pixel Adventure 1: 4 heroes (Ninja Frog, Mask Dude, Pink Man, Virtual Guy), terrain, 7 backgrounds, dust, collected | Pixel Frog, https://pixelfrog-assets.itch.io/pixel-adventure-1 (files taken from the Chickenz repo's copy) | CC0 | Free | 2026-09-25 | `apps/web/src/games/chickenz/assets/`; Ninja Frog frame also as `apps/web/public/favicon.png`, `apple-touch-icon.png` |

## Audio
| Asset | Source | Licence | Price | Date | Used in |
|---|---|---|---|---|---|
| Hub UI sounds: click ×2, confirm, back, coin, whoosh | ElevenLabs Sound Effects (`eleven_text_to_sound_v2`), prompts in `assets-src/hub/ui/` | ElevenLabs paid plan output, owned by us (ToS §4c) | Starter plan credits | 2026-09-25 | `apps/web/src/assets/audio/hub-ui.*` |
| Chickenz gameplay SFX (23): 5 weapon shots, hit, death, pickup, jump, double jump, explosion, stomp, escape, countdown, go, round win, match win, zone alarm, 4 hero taunts, emote pop | ElevenLabs Sound Effects (`eleven_text_to_sound_v2`), raw takes in `assets-src/chickenz/sfx/` | ElevenLabs paid plan output, owned by us (ToS §4c) | Starter plan credits | 2026-09-25 | `apps/web/src/games/chickenz/assets/audio/sfx.*` |
| Back a Bird wager stings: lock, drumroll, win, big win, lose, coins | ElevenLabs Sound Effects, prompts in `assets-src/chickenz/wager/PROMPTS.md` | ElevenLabs paid plan output, owned by us (ToS §4c) | Starter plan credits | 2026-09-25 | `apps/web/src/games/chickenz/assets/audio/wager.*` |
| Chickenz battle tracks A and B | ElevenLabs Music (`music_v2`), raw takes in `assets-src/chickenz/music/` | ElevenLabs paid plan output, cleared for commercial use | Starter plan credits | 2026-09-25 | `apps/web/src/games/chickenz/assets/music/` |
| Hub lobby theme | ElevenLabs Music (`music_v2`), raw take in `assets-src/hub/music/` | ElevenLabs paid plan output, cleared for commercial use | Starter plan credits | 2026-09-25 | `apps/web/src/assets/music/lobby.*` |

## Fonts
| Font | Source | Licence |
|---|---|---|
| Bungee | Google Fonts via @fontsource/bungee | OFL-1.1 |
| Rubik | Google Fonts via @fontsource/rubik | OFL-1.1 |
| Silkscreen | Google Fonts via @fontsource/silkscreen | OFL-1.1 |

## Purchases (receipts)
| Date | Item | Price | Receipt location |
|---|---|---|---|
