# RUCKUS Art Bible (direction A · Arcade Cabinet)

Decided on 2026-09-25. The three directions compared are in `docs/assets/brand-directions.html`. It borrows friendly copy from direction B and live tickers from direction C.

**Idea.** RUCKUS is an arcade. Each game is a cabinet with its own native look: pixel Chickenz, cinematic 3D pool, cartoon egg soccer, low-poly runner. The hub is the dark room they stand in. The dark ground lets the live game behind the menu and the gold of money carry every screen.

## Tokens (`apps/web/src/styles/tokens.css`)

**Colour**

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1B1024` | ground, deepest surface |
| `--ink-2` | `#24163A` | panels |
| `--ink-3` | `#2A1838` | raised surfaces and cards |
| `--line` | `#4A2D5E` | borders |
| `--cream` | `#FFF1D6` | primary text |
| `--cream-dim` | `#CDBFA8` | secondary text (AA on ink) |
| `--tomato` | `#FF5A36` | brand accent, active states, "yours" |
| `--tomato-deep` | `#7A1F10` | logo extrusion |
| `--teal` | `#2EC4B6` | secondary actions, info, tags |
| `--teal-deep` | `#178075` | teal button lip |
| `--gold` | `#FFC23A` | **money only**: balances, stakes, payouts, the Quick Play hero button |
| `--gold-deep` | `#B8780E` | gold button lip |

- Semantic `--win`, `--loss` and `--warn` are defined separately; they never reuse tomato or gold.
- Team and player colours (up to 4): tomato, teal, `#8C6BFF`, `#9BE15D`, used on nameplates and HP bars only.

**Type**

| Role | Face | Use |
|---|---|---|
| Display | **Bungee** (Google Fonts, OFL) | titles, buttons, big numbers; never body copy |
| Body / UI | **Rubik** 500/700 (OFL) | always `font-variant-numeric: tabular-nums` for balances, timers, odds, scores |
| Pixel tag | **Silkscreen** (OFL) | tiny labels (guest name, LIVE, room code), and the Chickenz in-game HUD |

- Type scale: 12 · 14 · 16 · 20 · 28 · 40 · 56.
- Uppercase labels get +0.06–0.08em tracking.

**Shape and depth**

- Radius: 10 px on cards, 14 px on buttons, 999 px on pills. Nothing uses the same radius and shadow everywhere.
- **Button language (the brand's signature):**
  - A thick bottom lip (`0 6px 0 <deep>`) plus a soft drop shadow.
  - On press, the button moves down 5 px and the lip collapses to 1 px, over 60 ms.
  - Variants: gold (money / primary), teal (secondary), ink (tertiary).
  - A press always plays a UI click.
- Cards are "cabinet tiles": ink-3 fill with a 2 px line border. The active tile gets a tomato border plus a 3 px tomato halo.

## Motion

- **In-game motion follows the game**: stepped, frame-snapped motion for pixel Chickenz; physical motion for pool.
- **Hub motion:**
  - Game switch: a 400 ms scrim crossfade.
  - Play: a camera dolly, never a screen swap.
  - Screen transitions: diamond wipes, from Chickenz.
- **Springs are reserved for money moments**: chips flying into the pot, payout count-ups, and the 5 celebration tiers (`game-feel-audio-ux.md` §5).
- **Reduced motion:** swap wipes and dollies for fades, and keep count-ups.

## Iconography and imagery

- **Icons:** Phosphor (MIT), in the Bold weight for UI and Fill for active states.
- **Don'ts:**
  - no emoji
  - no glassmorphism cards (the live game shows through a vignette instead)
  - no purple→blue gradients
  - no generic Inter

## Sound identity (`@arena/audio`)

- **UI:** short woody arcade clicks, a coin clink for money, and a rising three-note pitch for confirm.
- **Suspense:** a VRF-wait drum or tick loop that the ducking system hands over to a reveal sting.
- **Source:** ElevenLabs for the signature sounds, plus Kenney CC0 layers. Log every source in `docs/assets/<game>.md` and CREDITS.

## Copy voice

- Short, friendly and direct, from direction B: "Play with friends", "Back a bird", "Rematch?".
- Numbers always show units: `1,000.00 DEMO`, `2.8×`.
