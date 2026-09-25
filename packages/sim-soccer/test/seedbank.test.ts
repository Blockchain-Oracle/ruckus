import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FINISH_CALLS,
  FINISH_CLASSES,
  finishPresentation,
  type SeedBank,
} from '@arena/casino-math';

import { finishOf } from '../src/index.ts';

const BANK = new URL('../../casino-math/seedbanks/soccer-finish.v1.json', import.meta.url);
const bank = JSON.parse(readFileSync(fileURLToPath(BANK), 'utf8')) as SeedBank;
const weights = FINISH_CLASSES.map((c) => c.weight);

describe('Call the Finish seed bank v1', () => {
  it('has K seeds for every finish class', () => {
    expect(bank.classes).toHaveLength(FINISH_CLASSES.length);
    for (const seeds of bank.classes) expect(seeds).toHaveLength(bank.perClass);
  });

  // ADR-001: every bank entry must reproduce its class on the current sim build.
  it('every entry replays to its finish', () => {
    bank.classes.forEach((seeds, finish) => {
      for (const seed of seeds) expect(finishOf(seed), `seed ${seed}`).toBe(finish);
    });
  }, 60_000);

  it('a made call always shows a finish it covers, a missed call never does', () => {
    for (const call of FINISH_CALLS) {
      for (let i = 0; i < 40; i++) {
        const word = `0x${i.toString(16).padStart(2, '0').repeat(32)}` as const;
        for (const outcome of [0, 1]) {
          const p = finishPresentation(bank, word, call.covers, outcome, weights);
          expect((call.covers as readonly number[]).includes(p.finish)).toBe(outcome === 0);
          expect(bank.classes[p.finish]).toContain(p.seed);
        }
      }
    }
  });
});
