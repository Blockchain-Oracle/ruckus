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
  finishTomato: 5,
  finishViolet: 6,
  finishTomatoShot: 7,
  finishTomatoHeader: 8,
  finishTomatoWood: 9,
  finishVioletShot: 10,
  finishVioletHeader: 11,
  finishVioletWood: 12,
  finishEitherShot: 13,
  finishEitherHeader: 14,
  finishEitherWood: 15,
  finishAnyGoal: 16,
  finishNoGoal: 17,
  wipeoutAny: 18,
  wipeoutJump: 19,
  wipeoutDuck: 20,
  wipeoutMove: 21,
  wipeoutStrict: 22,
  wipeoutClean: 23,
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

/**
 * Egg Soccer "Call the Finish". A 2v2 bot match plays 20 s of golden goal and ends one of seven
 * ways; the declared table is in twentieths (close to what the bots actually do: see
 * docs/roadmap/stages/S20-soccer-wager.md). Each call covers some finishes and is its own
 * make/miss table at 96%, mirroring `_finishCover` in Solidity.
 */
export const FINISH_CLASSES = [
  { id: 'tomato-shot', team: 0, finish: 'shot', weight: 3 },
  { id: 'tomato-header', team: 0, finish: 'header', weight: 3 },
  { id: 'tomato-wood', team: 0, finish: 'wood', weight: 2 },
  { id: 'violet-shot', team: 1, finish: 'shot', weight: 3 },
  { id: 'violet-header', team: 1, finish: 'header', weight: 3 },
  { id: 'violet-wood', team: 1, finish: 'wood', weight: 2 },
  { id: 'no-goal', team: -1, finish: 'none', weight: 4 },
] as const;
export const FINISH_DENOMINATOR = 20n;
export type FinishClassIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Calls in bet-type order (bet type = BET_TYPE.finishTomato + index). */
export const FINISH_CALLS = [
  { betType: BET_TYPE.finishTomato, name: 'Tomato score', covers: [0, 1, 2] },
  { betType: BET_TYPE.finishViolet, name: 'Violet score', covers: [3, 4, 5] },
  { betType: BET_TYPE.finishTomatoShot, name: 'Tomato · shot', covers: [0] },
  { betType: BET_TYPE.finishTomatoHeader, name: 'Tomato · header', covers: [1] },
  { betType: BET_TYPE.finishTomatoWood, name: 'Tomato · off the woodwork', covers: [2] },
  { betType: BET_TYPE.finishVioletShot, name: 'Violet · shot', covers: [3] },
  { betType: BET_TYPE.finishVioletHeader, name: 'Violet · header', covers: [4] },
  { betType: BET_TYPE.finishVioletWood, name: 'Violet · off the woodwork', covers: [5] },
  { betType: BET_TYPE.finishEitherShot, name: 'A shot', covers: [0, 3] },
  { betType: BET_TYPE.finishEitherHeader, name: 'A header', covers: [1, 4] },
  { betType: BET_TYPE.finishEitherWood, name: 'Off the woodwork', covers: [2, 5] },
  { betType: BET_TYPE.finishAnyGoal, name: 'Any goal', covers: [0, 1, 2, 3, 4, 5] },
  { betType: BET_TYPE.finishNoGoal, name: 'No goal', covers: [6] },
] as const satisfies readonly {
  betType: BetType;
  name: string;
  covers: readonly FinishClassIndex[];
}[];

export const finishCover = (covers: readonly number[]) =>
  covers.reduce((sum, i) => sum + BigInt(FINISH_CLASSES[i]?.weight ?? 0), 0n);

function finishTables() {
  const out = {} as Record<(typeof FINISH_CALLS)[number]['betType'], BetTable>;
  for (const call of FINISH_CALLS) {
    const make = finishCover(call.covers);
    out[call.betType] = {
      betType: call.betType,
      name: `Call the Finish · ${call.name}`,
      classes: [
        { id: 'make', weight: make, multiplierBps: (DECLARED_RTP_BPS * FINISH_DENOMINATOR) / make },
        { id: 'miss', weight: FINISH_DENOMINATOR - make, multiplierBps: 0n },
      ],
    };
  }
  return out;
}

/**
 * Neon Dash "Call the Wipeout". A lone bot runs a short all-barrier gauntlet with no coins, so
 * its first hit ends the run; it ends one of five ways, in twentieths (close to what the gauntlet
 * bot actually does: docs/roadmap/stages/S25-runner-wager.md). Mirrors `_wipeoutCover`.
 * `verb` names the barrier colour that stopped the runner (sim-runner `WIPEOUTS` order).
 */
export const WIPEOUT_CLASSES = [
  { id: 'jump', verb: 'jump', weight: 5 },
  { id: 'duck', verb: 'duck', weight: 6 },
  { id: 'move', verb: 'move', weight: 3 },
  { id: 'strict', verb: 'strict', weight: 2 },
  { id: 'clean', verb: 'clean', weight: 4 },
] as const;
export const WIPEOUT_DENOMINATOR = 20n;
type WipeoutClassIndex = 0 | 1 | 2 | 3 | 4;

/** Calls in bet-type order (bet type = BET_TYPE.wipeoutAny + index). */
export const WIPEOUT_CALLS = [
  { betType: BET_TYPE.wipeoutAny, name: 'Any wipeout', covers: [0, 1, 2, 3] },
  { betType: BET_TYPE.wipeoutJump, name: 'Fails a jump', covers: [0] },
  { betType: BET_TYPE.wipeoutDuck, name: 'Fails a duck', covers: [1] },
  { betType: BET_TYPE.wipeoutMove, name: 'Fails a dodge', covers: [2] },
  { betType: BET_TYPE.wipeoutStrict, name: 'Fails a strict duck', covers: [3] },
  { betType: BET_TYPE.wipeoutClean, name: 'Clean run', covers: [4] },
] as const satisfies readonly {
  betType: BetType;
  name: string;
  covers: readonly WipeoutClassIndex[];
}[];

export const wipeoutCover = (covers: readonly number[]) =>
  covers.reduce((sum, i) => sum + BigInt(WIPEOUT_CLASSES[i]?.weight ?? 0), 0n);

function wipeoutTables() {
  const out = {} as Record<(typeof WIPEOUT_CALLS)[number]['betType'], BetTable>;
  for (const call of WIPEOUT_CALLS) {
    const make = wipeoutCover(call.covers);
    out[call.betType] = {
      betType: call.betType,
      name: `Call the Wipeout · ${call.name}`,
      classes: [
        {
          id: 'make',
          weight: make,
          multiplierBps: (DECLARED_RTP_BPS * WIPEOUT_DENOMINATOR) / make,
        },
        { id: 'miss', weight: WIPEOUT_DENOMINATOR - make, multiplierBps: 0n },
      ],
    };
  }
  return out;
}

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
  ...finishTables(),
  ...wipeoutTables(),
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
