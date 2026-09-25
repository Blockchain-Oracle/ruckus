/**
 * Mirror of `RuckusGame._table` (contracts/src/RuckusGame.sol). Every entry must match the
 * Solidity constants exactly — the parity vectors in contracts/vectors enforce it (ADR-004).
 */

/** Basis points: 10_000 bps = 1.0×. */
export const BPS = 10_000n;
export const WAD = 10n ** 18n;
/** RUCKUS declares one RTP for every bet type (ADR-001). */
export const DECLARED_RTP_BPS = 9_600n;

export const BET_TYPE = {
  backChicken: 0,
} as const;
export type BetType = (typeof BET_TYPE)[keyof typeof BET_TYPE];

export type OutcomeClass = {
  readonly id: string;
  readonly weight: bigint;
  readonly multiplierBps: bigint;
};

export type BetTable = {
  readonly betType: BetType;
  readonly name: string;
  readonly classes: readonly OutcomeClass[];
};

export const CHICKENZ_FIGHTERS = 4;

export const BET_TABLES = {
  [BET_TYPE.backChicken]: {
    betType: BET_TYPE.backChicken,
    name: 'Back Your Chicken',
    classes: [
      { id: 'flawless-win', weight: 1n, multiplierBps: 60_000n },
      { id: 'win', weight: 4n, multiplierBps: 28_000n },
      { id: 'second', weight: 5n, multiplierBps: 4_000n },
      { id: 'lose', weight: 10n, multiplierBps: 0n },
    ],
  },
} as const satisfies Record<BetType, BetTable>;

export function getBetTable(betType: BetType): BetTable {
  return BET_TABLES[betType];
}
