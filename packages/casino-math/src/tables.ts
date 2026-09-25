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
  callShotStraight: 1,
  callShotCut: 2,
  callShotThin: 3,
  callShotLong: 4,
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
  ...callShot(BET_TYPE.callShotStraight, 'Call Your Shot · Straight', 3n, 1n, 12_800n),
  ...callShot(BET_TYPE.callShotCut, 'Call Your Shot · Cut', 1n, 1n, 19_200n),
  ...callShot(BET_TYPE.callShotThin, 'Call Your Shot · Thin', 1n, 3n, 38_400n),
  ...callShot(BET_TYPE.callShotLong, 'Call Your Shot · Long', 1n, 9n, 96_000n),
} as const satisfies Record<BetType, BetTable>;

/** Call Your Shot tiers: two classes, make (top) and miss, mirroring `_makeMiss` in Solidity. */
function callShot<T extends BetType>(
  betType: T,
  name: string,
  make: bigint,
  miss: bigint,
  makeBps: bigint,
) {
  return {
    [betType]: {
      betType,
      name,
      classes: [
        { id: 'make', weight: make, multiplierBps: makeBps },
        { id: 'miss', weight: miss, multiplierBps: 0n },
      ],
    },
  } as Record<T, BetTable>;
}

export const POOL_OBJECT_BALLS = 15;
export const POOL_POCKETS = 6;
/** Tier order, easiest first; the index + 1 is the bet type. */
export const CALL_SHOT_TIERS = [
  BET_TYPE.callShotStraight,
  BET_TYPE.callShotCut,
  BET_TYPE.callShotThin,
  BET_TYPE.callShotLong,
] as const;

export function getBetTable(betType: BetType): BetTable {
  return BET_TABLES[betType];
}
