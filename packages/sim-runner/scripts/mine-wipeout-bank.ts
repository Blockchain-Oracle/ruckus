// Mines the "Call the Wipeout" seed bank: K gauntlet runs per ending (ADR-001 §4).
// Writes packages/casino-math/seedbanks/runner-wipeout.v1.json and prints its keccak hash.
//   pnpm -F @arena/sim-runner mine-bank
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { BET_TYPE, bankHash } from '@arena/casino-math';

import { GAUNTLET, runWipeout, WIPEOUTS } from '../src/index.ts';

const K = 512;
/** A fixed, published start: anyone can re-mine and get the same bank. */
const FIRST_SEED = 0xda54;
const OUT = new URL('../../casino-math/seedbanks/runner-wipeout.v1.json', import.meta.url);

const classes: number[][] = WIPEOUTS.map(() => []);
let seed = FIRST_SEED;
while (classes.some((c) => c.length < K)) {
  const bucket = classes[runWipeout(seed)];
  if (bucket && bucket.length < K) bucket.push(seed);
  seed += 1;
}
const bank = {
  version: 1,
  game: 'runner',
  betType: BET_TYPE.wipeoutAny,
  players: 1,
  difficulty: GAUNTLET.skill,
  mapRule: `gauntlet ${GAUNTLET.lengthM} m, a barrier every ${GAUNTLET.everyS} s, no coins`,
  backedSlot: -1,
  firstSeed: FIRST_SEED,
  scanned: seed - FIRST_SEED,
  perClass: K,
  classes,
};
const json = `${JSON.stringify(bank)}\n`;
writeFileSync(fileURLToPath(OUT), json);
console.info(`[bank] scanned ${bank.scanned} runs → ${fileURLToPath(OUT)}`);
console.info(`[bank] keccak ${bankHash(json)}`);
