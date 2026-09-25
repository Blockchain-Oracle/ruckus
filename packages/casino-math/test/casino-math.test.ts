import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';

import {
  BET_TABLES,
  BET_TYPE,
  buildParityVectors,
  DECLARED_RTP_BPS,
  drawClass,
  FINISH_CALLS,
  getBetTable,
  maxMultiplierX,
  maxReservedProfit,
  payout,
  rtp,
} from '../src/index.ts';

const VECTORS_DIR = resolve(import.meta.dirname, '../../../contracts/vectors');
const VECTOR_FILES = [
  [BET_TYPE.backChicken, 'back-chicken.json'],
  [BET_TYPE.callShotStraight, 'call-shot-1.json'],
  [BET_TYPE.callShotCut, 'call-shot-2.json'],
  [BET_TYPE.callShotThin, 'call-shot-3.json'],
  [BET_TYPE.callShotLong, 'call-shot-4.json'],
  ...FINISH_CALLS.map((c) => [c.betType, `finish-${c.betType}.json`] as const),
] as const;

describe('bet tables', () => {
  it.each(Object.values(BET_TABLES))('$name pays exactly the declared RTP', (table) => {
    const { numeratorBps, denominator } = rtp(table);
    expect(numeratorBps).toBe(DECLARED_RTP_BPS * denominator);
  });

  it('top multiplier fits escrow + reserve to the wei', () => {
    for (const wager of [1n, 7n, 10n ** 18n, 10n ** 27n + 3n]) {
      expect(payout(wager, BET_TYPE.backChicken, 0)).toBe(
        wager + maxReservedProfit(wager, BET_TYPE.backChicken),
      );
    }
    expect(maxMultiplierX(BET_TYPE.backChicken)).toBe(6);
  });
});

describe('drawClass', () => {
  const table = getBetTable(BET_TYPE.backChicken);

  it('maps tickets onto cumulative weights', () => {
    const word = (n: number) => `0x${n.toString(16).padStart(64, '0')}` as const;
    expect([0, 1, 4, 5, 9, 10, 19, 20].map((n) => drawClass(word(n), table))).toEqual([
      0, 1, 1, 2, 2, 3, 3, 0,
    ]);
  });

  it('is unbiased over many draws (within 4σ of the table)', () => {
    const counts = [0, 0, 0, 0];
    const draws = 40_000;
    for (let i = 0; i < draws; i++) {
      const word = `0x${bytesToHex(keccak_256(utf8ToBytes(`draw-${i}`)))}` as const;
      const cls = drawClass(word, table);
      counts[cls] = (counts[cls] ?? 0) + 1;
    }
    table.classes.forEach((outcome, i) => {
      const p = Number(outcome.weight) / 20;
      const sigma = Math.sqrt(draws * p * (1 - p));
      expect(Math.abs((counts[i] ?? 0) - draws * p)).toBeLessThan(4 * sigma);
    });
  });
});

describe('parity vectors', () => {
  it.each(VECTOR_FILES)(
    'committed vectors for bet %i (%s) match the TS mirror (run `pnpm vectors`)',
    (betType, file) => {
      const committed = JSON.parse(readFileSync(resolve(VECTORS_DIR, file), 'utf8'));
      expect(committed).toEqual(JSON.parse(JSON.stringify(buildParityVectors(betType))));
    },
  );
});
