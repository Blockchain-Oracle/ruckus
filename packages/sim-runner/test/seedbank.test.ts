import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  bankHash,
  type SeedBank,
  WIPEOUT_CALLS,
  WIPEOUT_CLASSES,
  wipeoutPresentation,
} from '@arena/casino-math';

import { runWipeout, WIPEOUTS } from '../src/index.ts';

const BANK = new URL('../../casino-math/seedbanks/runner-wipeout.v1.json', import.meta.url);
const raw = readFileSync(fileURLToPath(BANK), 'utf8');
const bank = JSON.parse(raw) as SeedBank;
/** The published hash (stage doc): anyone can check the committed bank against it. */
const PUBLISHED_KECCAK = '0x7f4bed641061c0e38dcb7c7b38d03f4f60ce08375c3b4879277450095023c30a';
const weights = WIPEOUT_CLASSES.map((c) => c.weight);

describe('Call the Wipeout seed bank v1', () => {
  it('is the published bank', () => {
    expect(bankHash(raw)).toBe(PUBLISHED_KECCAK);
  });

  it('lines up with the declared table', () => {
    expect(WIPEOUT_CLASSES.map((c) => c.verb)).toEqual([...WIPEOUTS]);
    expect(bank.classes).toHaveLength(WIPEOUT_CLASSES.length);
    for (const seeds of bank.classes) expect(seeds).toHaveLength(bank.perClass);
  });

  // ADR-001: every bank entry must reproduce its class on the current sim build.
  // Whole-bank work: seconds on a laptop, past vitest's 5 s default on shared CI runners.
  it(
    'every entry replays to its ending',
    { timeout: 60_000 },
    () => {
      bank.classes.forEach((seeds, ending) => {
        for (const seed of seeds) expect(runWipeout(seed), `seed ${seed}`).toBe(ending);
      });
    },
    120_000,
  );

  it('a made call always shows an ending it covers, a missed call never does', () => {
    for (const call of WIPEOUT_CALLS) {
      for (let i = 0; i < 40; i++) {
        const word = `0x${i.toString(16).padStart(2, '0').repeat(32)}` as const;
        for (const outcome of [0, 1]) {
          const p = wipeoutPresentation(bank, word, call.covers, outcome, weights);
          expect((call.covers as readonly number[]).includes(p.ending)).toBe(outcome === 0);
          expect(bank.classes[p.ending]).toContain(p.seed);
        }
      }
    }
  });
});
