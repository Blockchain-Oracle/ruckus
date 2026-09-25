import { keccak_256 } from '@noble/hashes/sha3.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

import { drawClass, payout } from './math.ts';
import { BET_TYPE, type BetType, getBetTable } from './tables.ts';

const VECTOR_COUNT = 64;
const WAGERS = [1n, 999n, 10n ** 18n, 123_456_789_012_345_678_901n] as const;

export type ParityVectors = {
  betType: BetType;
  randomness: `0x${string}`[];
  classes: number[];
  wagers: string[];
  /** payouts[i] = payout(wagers[i % wagers.length], classes[i]) */
  payouts: string[];
};

function toHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/** Deterministic inputs: hashed indices plus the rejection-sampling edge words. */
export function buildParityVectors(betType: BetType = BET_TYPE.backChicken): ParityVectors {
  const edgeWords: `0x${string}`[] = [
    `0x${'00'.repeat(32)}`,
    `0x${'ff'.repeat(32)}`, // rejected for D=20 → re-hash path
    `0x${'ff'.repeat(31)}ef`, // 2^256 − 17: largest accepted word for D=20
  ];
  const hashed = Array.from({ length: VECTOR_COUNT - edgeWords.length }, (_, i) =>
    toHex(keccak_256(utf8ToBytes(`ruckus-parity-${i}`))),
  );
  const randomness = [...edgeWords, ...hashed];
  const table = getBetTable(betType);
  const classes = randomness.map((word) => drawClass(word, table));
  const payouts = classes.map((classIndex, i) =>
    payout(WAGERS[i % WAGERS.length] ?? 0n, betType, classIndex).toString(),
  );
  return { betType, randomness, classes, wagers: WAGERS.map(String), payouts };
}
