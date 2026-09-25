/** How long a framed page waits for the chain.wtf host handshake before booting the demo. */
export const HOST_HANDSHAKE_TIMEOUT_MS = 3_000;

/** Presentation seed-bank version encoded into gameData (ADR-001); bump with each new bank. */
export const PRESENTATION_VERSION = 1;

/** Safety net: reveal a settled session even if its presentation never reports completion. */
export const REVEAL_WATCHDOG_MS = 12_000;

export const DEMO = {
  tokenSymbol: 'DEMO',
  tokenDecimals: 18,
  startingBalance: 1_000n * 10n ** 18n,
  /** Mirrors a production vault: ~1% of liquidity may be at risk per bet. */
  availableLiquidity: 5_000_000n * 10n ** 18n,
  maxBetRiskBps: 100,
  /** Simulated chain + VRF latency so the suspense beat plays like production. */
  openDelayMs: 450,
  settleDelayMs: 1_400,
  storageKey: 'ruckus:demo-balance',
  chainId: 0,
} as const;
