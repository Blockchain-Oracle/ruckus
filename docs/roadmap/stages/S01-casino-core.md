# S01: Casino core (contract, math, bridge, DemoHost, sandbox harness)

**Goal:** one real, finished bet type completes the full bet → WAITING_RANDOMNESS → reveal → payout loop in the local simulator, and also in standalone DemoHost mode.

**Read first:**
- `casino-sdk/docs/`: GETTING_STARTED, CONTRACT_CONSTRAINTS, RANDOMNESS_DICE, CHAIN_WTF_CASINO_GAMES §3–6 and §8.1, SLOTS_RISK_AND_RESERVES, LOCAL_SIMULATOR
- `casino-sdk/src/{guest,types,bet-limits,manifest}.ts`
- `casino-sdk/examples/coinflip-public/src/lib/useCasinoHost.ts`
- ADR-001, ADR-003 and ADR-004

## Tasks
1. [ ] **Start the simulator:** `cd casino-sdk && npm install && npm start`. Check :3300 loads and coinflip settles. Record the ports in HANDOFF.
2. [ ] **`packages/chain-casino-sdk`:**
   - verbatim copies of `casino-sdk/src/*.ts` (not tests), plus `package.json` named `@chain/casino-sdk`
   - `sync-sdk` script
   - Vitest byte-compare test against `casino-sdk/src`
3. [ ] **`contracts/` (Foundry):**
   - `foundry.toml`: solc 0.8.30, `via_ir`, optimizer runs 200, matching the simulator
   - copy `ICasinoGameV2.sol` into `contracts/src/interfaces/`
   - `src/ArenaGame.sol`: the class-table contract with a **placeholder name** (✱N renames it). Bet type 0 is a simple, finished, honest table used to prove the pipe, for example a fairly priced multi-tier draw; it must still feel like a game in the UI.
   - One `_payout()`
   - uint256 rejection sampling
   - `reservedProfitDelta = 0` on settle
   - `bodyVarianceScaled`
4. [ ] **`contracts/test`:**
   - fuzz: payout never exceeds `escrowedStake + reservedProfit`
   - top-multiplier settle test
   - RTP computed on-chain from the tables equals the declared value
   - parity vectors in `contracts/vectors/*.json`
   - `forge build --sizes` under 24,576 bytes
5. [ ] **`pnpm contracts:sync`:** a chokidar watch that copies `contracts/src/*Game.sol` (flattened, including the interface import) into `casino-sdk/simulator/contracts/`. Confirm the simulator picks it up and it shows in the game picker.
6. [ ] **`packages/casino-math`:**
   - TS mirror of the tables and `_payout`
   - exact RTP enumeration (BigInt)
   - parity test against the same vectors
   - `computeMaxWager` helper using each bet type's top multiplier
7. [ ] **`packages/casino-bridge`:**
   - module-level singleton `connect()` that tolerates StrictMode (the host binds to the first handshake)
   - chooses DemoHost when `window.parent === window` or the Penpal handshake times out (~3 s)
   - **DemoHost** implements `HostApiV1`:
     - emits real-shaped `HostSnapshotV1`: `pending:` row → `WAITING_RANDOMNESS` → `SETTLED` with realistic delays
     - settles with `@arena/casino-math` using `crypto.getRandomValues` as a stand-in VRF
     - demo balance persisted with try/catch storage
   - session routing by the `betType` decoded from `raw.gameData`
   - a `revealOutcome` watchdog (~12 s) plus reveal on unmount
8. [ ] **Debug page:** a minimal `apps/web` route `?debug=casino` that places bets through the bridge, used to exercise both host modes.
9. [ ] **`tooling/prod-frame/`:** a static page on a second port that iframes the web app with `sandbox="allow-scripts allow-same-origin"`, matching production exactly. Include a checklist page covering popups, pointer lock, clipboard, gamepad, audio unlock, WebGPU, WSS and localStorage.

## Acceptance
- In the simulator the full loop works, including a **top-multiplier win**.
- The unhappy paths pass:
  - slow indexer (raise the lag in the setup panel)
  - stuck randomness (`cast rpc hardhat_mine 0x10`, then cancel)
  - wallet not ready
  - refresh mid-round, which restores the session
- Standalone opens in DemoHost within 3 s, with the DEMO badge showing.
- Foundry and Vitest parity are green, and the size gate passes.

## Exit checklist
ROADMAP · HANDOFF (record the current local contract address) · LOG · commits `feat(contracts)…`, `feat(casino-math)…`, `feat(casino-bridge)…`
