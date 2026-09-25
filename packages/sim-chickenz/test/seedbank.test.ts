import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { bankHash, bankMapFor, presentationSeed, type SeedBank } from '@arena/casino-math';

import { back_bird_class } from '../pkg/chickenz_sim.js';
import { loadChickenzSync } from '../src/index.ts';

const BANK_PATH = new URL(
  '../../casino-math/seedbanks/chickenz-back-bird.v1.json',
  import.meta.url,
);
const bankJson = readFileSync(fileURLToPath(BANK_PATH), 'utf8');
const bank = JSON.parse(bankJson) as SeedBank;

beforeAll(() => {
  loadChickenzSync(
    readFileSync(fileURLToPath(new URL('../pkg/chickenz_sim_bg.wasm', import.meta.url))),
  );
});

describe('Back a Bird seed bank v1', () => {
  it('has K seeds for every contract class', () => {
    expect(bank.classes).toHaveLength(4);
    for (const seeds of bank.classes) expect(seeds).toHaveLength(bank.perClass);
  });

  // ADR-001: every bank entry must reproduce its class on the current sim build.
  it('every entry replays to its class', () => {
    const difficulties = Int32Array.from({ length: bank.players }, () => bank.difficulty);
    bank.classes.forEach((seeds, classIndex) => {
      for (const seed of seeds) {
        expect(back_bird_class(seed, bankMapFor(seed), difficulties), `seed ${seed}`).toBe(
          classIndex,
        );
      }
    });
  });

  it('presentation is a pure function of the VRF word', () => {
    const word = '0x8f2c5b0e1d3a4c5b6a79808f7e6d5c4b3a291817161514131211100f0e0d0c0b' as const;
    const a = presentationSeed(bank, word, 1);
    expect(presentationSeed(bank, word, 1)).toBe(a);
    expect(bank.classes[1]).toContain(a);
    expect(bankHash(bankJson)).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
