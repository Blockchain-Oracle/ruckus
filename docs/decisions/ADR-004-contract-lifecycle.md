# ADR-004: One class-table casino contract

- Status: accepted (2026-09-25)
- Context:
  - One hosted URL has one `game.manifest.json`, one `gameId` and therefore one registered contract.
  - Every redeploy gets a new address. After submission, the Chain maintainers audit and whitelist a *specific* address.

## Decision
- **One generic class-table contract** named `<Name>Game.sol`, with the name set at checkpoint ✱N. `canonicalCasinoGameId` strips the trailing "Game", lowercases the rest and keeps only alphanumerics.
  - `gameData = abi.encode(uint8 betType, uint8 presentationVersion, bytes params)`.
  - Each `betType` is a constant table: `weights[]`, `multipliers[]` and a denominator `D`.
  - **Everything goes through one `_payout(wager, betType, class)`**, which feeds `quoteCaps`, `quoteRiskParams`, `onSessionStart` and `onRandomness`. This avoids the "payout exceeds reserve by 1 wei" trap described in `CONTRACT_CONSTRAINTS.md`.
  - `reservedProfitDelta = 0` on the settling step.
  - `bodyVarianceScaled` is computed for multi-tier tables (`SLOTS_RISK_AND_RESERVES.md`).
  - `quoteForfeitPayout` returns 0 unless the payout depends only on already-revealed state.
  - No constructor arguments and no external libraries. The simulator only auto-deploys argument-less `ICasinoGameV2` implementations, and it resolves imports only inside `simulator/contracts/`.
- **Size gate:** `forge build --sizes` in CI must stay under the 24,576-byte EIP-170 limit.
- **Source and tooling:**
  - The source lives in `contracts/src/` (Foundry).
  - `pnpm contracts:sync` copies it into `casino-sdk/simulator/contracts/` using chokidar, because symlinks are unreliable with `fs.watch`. The copy is gitignored.
  - Foundry runs fuzz tests and the **Solidity↔TS parity test**, using shared JSON vectors in `contracts/vectors/`.
- **Deploy discipline:** every bet type that goes into a submission is designed before that deploy, because each change means a new address.
