[Skip to content](https://sdk.chain.wtf/casino#vocs-content)

[CHAIN SDK](https://sdk.chain.wtf/)

[Overview](https://sdk.chain.wtf/)

@chain/casino-sdk

[Overview](https://sdk.chain.wtf/casino) [Getting Started](https://sdk.chain.wtf/casino/GETTING_STARTED) [Local Simulator](https://sdk.chain.wtf/casino/LOCAL_SIMULATOR) [Building Casino Games](https://sdk.chain.wtf/casino/CHAIN_WTF_CASINO_GAMES) [Contract Constraints](https://sdk.chain.wtf/casino/CONTRACT_CONSTRAINTS) [Slots Risk & Reserves](https://sdk.chain.wtf/casino/SLOTS_RISK_AND_RESERVES) [Slot Engine](https://sdk.chain.wtf/casino/SLOT_ENGINE) [Migrating from Stake Engine](https://sdk.chain.wtf/casino/MIGRATING_FROM_STAKE_ENGINE) [Visual & UX](https://sdk.chain.wtf/casino/VISUAL_AND_UX) [Repo Structure](https://sdk.chain.wtf/casino/REPO_STRUCTURE) [Randomness Verification](https://sdk.chain.wtf/casino/RANDOMNESS_VERIFICATION) [Changelog](https://sdk.chain.wtf/casino/CHANGELOG)

@chain/pvp-sdk

[Overview](https://sdk.chain.wtf/pvp) [Local Simulator](https://sdk.chain.wtf/pvp/LOCAL_SIMULATOR) [Building PvP Games](https://sdk.chain.wtf/pvp/CHAIN_WTF_PVP_GAMES) [Contract Constraints](https://sdk.chain.wtf/pvp/PVP_CONTRACT_CONSTRAINTS) [Visual & UX](https://sdk.chain.wtf/pvp/VISUAL_AND_UX) [Randomness Verification](https://sdk.chain.wtf/pvp/RANDOMNESS_VERIFICATION) [Changelog](https://sdk.chain.wtf/pvp/CHANGELOG)

[CHAIN SDK](https://sdk.chain.wtf/)

Search...

Ctrl

K

On this page

On this page

- [Documentation](https://sdk.chain.wtf/casino#documentation)
- [What's in the package](https://sdk.chain.wtf/casino#whats-in-the-package)
- [The short version of shipping a game](https://sdk.chain.wtf/casino#the-short-version-of-shipping-a-game)
- [Going deeper on risk math](https://sdk.chain.wtf/casino#going-deeper-on-risk-math)

Copy page for AI

# Casino SDK

[↓ Download Casino SDK (.zip)](https://sdk.chain.wtf/sdk/casino-sdk.zip)

Build **on-chain casino games** — single player vs. the house liquidity pool — that run inside
the Chain.wtf platform as sandboxed iframes.

A game is a Solidity contract implementing `ICasinoGameV2` plus a static web frontend that talks
to the host app through the `@chain/casino-sdk` bridge. Your frontend contains no wallet code:
the host signs every transaction, streams state snapshots into your iframe, and handles gasless
betting, balances and session tracking for you. You focus on game logic and presentation.

The SDK ships with a [local simulator](https://sdk.chain.wtf/LOCAL_SIMULATOR) — a one-command offline stack
(local chain, real VRF node, minimal casino deployment, production-faithful host harness) so you
can build and test the whole thing on your machine without any platform access.

**New here? Start with [Getting Started](https://sdk.chain.wtf/GETTING_STARTED)** — it takes you step by step
from an empty folder to a working game running locally.

## Documentation [Copy link and go to this section](https://sdk.chain.wtf/casino\#documentation "Copy link and go to this section")

| Guide | What it covers |
| --- | --- |
| [Getting Started](https://sdk.chain.wtf/GETTING_STARTED) | **Start here.** Step-by-step: run the local stack, write the contract, build the UI, ship. |
| [Local Simulator](https://sdk.chain.wtf/LOCAL_SIMULATOR) | The offline test environment: what it runs, what it replicates from production, how to break things on purpose. |
| [Building Casino Games](https://sdk.chain.wtf/CHAIN_WTF_CASINO_GAMES) | **The complete reference**: host/guest model, Penpal bridge, `gameData` / `actionData`, ABI patterns, full frontend examples (coinflip, blackjack, mines). |
| [Contract Constraints](https://sdk.chain.wtf/CONTRACT_CONSTRAINTS) | `CasinoGameFacet` rules your contract must respect: phases, timeouts, whitelist, portfolio risk, reverting errors. |
| [Randomness → Dice](https://sdk.chain.wtf/RANDOMNESS_DICE) | Deriving unbiased dice/cards from `bytes32` RNG — rejection sampling, never raw `byte % 6`. Canonical Solidity/TS. |
| [Slots Risk & Reserves](https://sdk.chain.wtf/SLOTS_RISK_AND_RESERVES) | Why heavy-tail games (slots, jackpots) need `quoteRiskParams` \+ a tiered jackpot reserve. |
| [Slot Engine](https://sdk.chain.wtf/SLOT_ENGINE) | Add-on: ship a slot as a settlement table on the shared slot engine, no Solidity. Run the example locally. |
| [Migrating from Stake Engine](https://sdk.chain.wtf/MIGRATING_FROM_STAKE_ENGINE) | Convert a Stake Engine math export into a slot engine title and port its frontend. |
| [Visual & UX](https://sdk.chain.wtf/VISUAL_AND_UX) | Iframe sandbox, theme/locale snapshot, manifest presentation, aligning with the main app's look. |
| [Repo Structure](https://sdk.chain.wtf/REPO_STRUCTURE) | What's inside the `@chain/casino-sdk` package. |
| [Changelog](https://sdk.chain.wtf/CHANGELOG) | Date-versioned SDK release notes. |

## What's in the package [Copy link and go to this section](https://sdk.chain.wtf/casino\#whats-in-the-package "Copy link and go to this section")

- `src/` — the bridge SDK: `connectGameToHost` (guest), `connectHostToGame` (host), shared
types, manifest validation. Also distributed via the `@chain/ui` shadcn registry as
`shadcn add @chain/casino-sdk`.
- `simulator/contracts/ICasinoGameV2.sol` — the canonical on-chain game interface.
- `examples/coinflip-public/` — a complete example game (contract + UI + manifest) to copy from.
- `simulator/` — the local test environment ( [docs](https://sdk.chain.wtf/LOCAL_SIMULATOR)).
- `slot-engine/` — optional add-on for slots: a shared engine contract, a title compiler and
deployer CLI, a Stake Engine importer and the Lucky Reels example ( [docs](https://sdk.chain.wtf/SLOT_ENGINE)).
Not needed for games that ship their own contract.

## The short version of shipping a game [Copy link and go to this section](https://sdk.chain.wtf/casino\#the-short-version-of-shipping-a-game "Copy link and go to this section")

1. **Contract**: implement `ICasinoGameV2` — `quoteCaps`, `quoteRiskParams`, `onSessionStart`,
`onRandomness`, and `onPlayerAction` for multi-step games.
2. **Frontend**: call `connectGameToHost`, render from the host snapshot, place bets via
`hostApi.openSession` / `submitAction`, and call `revealOutcome` after your win animation.
3. **Manifest**: serve `game.manifest.json` at the same origin as the game URL.
4. **Handoff**: deliver the audited contract + hosted static build; the Chain.wtf maintainers
wire the whitelist, indexer and catalog.

## Going deeper on risk math [Copy link and go to this section](https://sdk.chain.wtf/casino\#going-deeper-on-risk-math "Copy link and go to this section")

`SLOTS_RISK_AND_RESERVES.md` describes the portfolio VaR and the
slots tiered model, including the body variance your quote must carry. The contracts
(`ICasinoGameV2`, `CasinoGameFacet`, `CasinoRiskLib`) are the source of truth for field names and
units.

Copy page for AI

[OverviewPrevious`Shift`  `←`](https://sdk.chain.wtf/) [Getting StartedNext`Shift`  `→`](https://sdk.chain.wtf/casino/GETTING_STARTED)

Ask AI...

Ctrl

I