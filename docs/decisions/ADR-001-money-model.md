# ADR-001: Money model, seed-bank presentation, novelty

- Status: accepted (2026-09-25)
- Context:
  - The jam requires `ICasinoGameV2`: one player vs the house, the outcome derived from VRF, and a declared RTP of 93–98% that exactly matches the paytable.
  - Our product is a skill-based multiplayer arena.
  - Skill can't settle money: the contract can't see an off-chain match, and skill breaks a fixed RTP.

## Decision
1. **Free skill arena.** Multiplayer skill play (rooms, friends, bots, tournaments) is free and earns only points and rank.
2. **VRF wagers.** Money moves only through casino rounds on our single `ICasinoGameV2` contract (see ADR-004). There are two kinds:
   - *decision moments*: the player chooses something before the draw, and VRF answers
   - *bets on VRF-seeded bot matches*
3. **The contract decides the outcome class.**
   - It rejection-samples a uint256 from the VRF word: `limit = floor(2^256/D)*D`, with bounded keccak re-hashes.
   - Each bet type is a constant class table: `weights[]`, `multipliers[]` and a denominator.
   - **Every bet type pays exactly the single declared RTP** (target 96.00%).
4. **The client only presents the drawn class, in O(1) time, using seed banks.**
   - Offline-mined banks live at `packages/casino-math/seedbanks/v{N}.json`, with K=512 sim seeds per (betType, class). The bank's keccak hash is published.
   - Presentation seed = `bank[class][rejectionSample(keccak(randomness, "present"), K)]`.
   - `gameData` carries `presentationVersion`. Old wasm builds and banks are kept forever, so `/verify` always reproduces any past round.
   - A CI test asserts that every bank entry reproduces its class.
   - An optional live search is capped at 64 tries or about 50 ms, then falls back to the bank.
5. **Skill never touches payouts.** Decision moments never pause a live 60 Hz match: they happen in solo play, practice or intermissions.

## Novelty
- Plain "bet on a simulated contestant" and "call the break count" overlap existing jam entries: Chain Arena, W.ARENA, TILT!, Clatter, Roll Call. Penalty shootouts are an existing casino genre.
- A wager's novelty must therefore come from our social and multiplayer layer. The main example is the **watch party**: your VRF round plays as a live bot exhibition inside your room, while friends watch, emote and see the pot fly.
- Limitation: each session has its own VRF word, so there is no shared multi-bettor pool.
- Every wager spike (S10a, S15, S20, S25) must pass a novelty check against `docs/competitors.md` and the Stake, Roobet, BC.Game, Rollbit and Shuffle originals listed in `docs/research/02-web3-game-hackathons.md` §C.

## Consequences
- The sims must be fully deterministic, and so must the bot policies (see ADR-005).
- A `/verify` page and a seed-bank miner are required tooling.
- The declared math lives in exactly one place: the contract's class tables. The TypeScript mirror in `@arena/casino-math` is kept equal to it by the parity tests.
