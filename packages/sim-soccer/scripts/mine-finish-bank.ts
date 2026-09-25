// Mines the "Call the Finish" seed bank: K golden-goal bot matches per finish class (ADR-001 §4).
// Writes packages/casino-math/seedbanks/soccer-finish.v1.json and prints its keccak hash.
//   pnpm -F @arena/sim-soccer mine-bank
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { BET_TYPE, bankHash } from '@arena/casino-math';

import { finishOf, GOLDEN, NO_GOAL_CLASS } from '../src/index.ts';

const K = 512;
/** A fixed, published start: anyone can re-mine and get the same bank. */
const FIRST_SEED = 0x50cce4;
const CLASSES = NO_GOAL_CLASS + 1;
const OUT = new URL('../../casino-math/seedbanks/soccer-finish.v1.json', import.meta.url);

const classes: number[][] = Array.from({ length: CLASSES }, () => []);
let seed = FIRST_SEED;
while (classes.some((c) => c.length < K)) {
  const cls = finishOf(seed);
  const bucket = classes[cls];
  if (bucket && bucket.length < K) bucket.push(seed);
  seed += 1;
}
const bank = {
  version: 1,
  game: 'soccer',
  betType: BET_TYPE.finishTomato,
  players: GOLDEN.perTeam * 2,
  difficulty: GOLDEN.skill,
  mapRule: 'golden goal, 2v2',
  backedSlot: -1,
  firstSeed: FIRST_SEED,
  scanned: seed - FIRST_SEED,
  perClass: K,
  classes,
};
const json = `${JSON.stringify(bank)}\n`;
writeFileSync(fileURLToPath(OUT), json);
console.info(`[bank] scanned ${bank.scanned} matches → ${fileURLToPath(OUT)}`);
console.info(`[bank] keccak ${bankHash(json)}`);
