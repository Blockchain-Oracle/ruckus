// Writes contracts/vectors/*.json (one per bet type), which the Foundry parity test replays against Solidity.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BET_TYPE, type BetType, buildParityVectors, FINISH_CALLS } from '../src/index.ts';

const DIR = resolve(import.meta.dirname, '../../../contracts/vectors');
const FILES = {
  [BET_TYPE.backChicken]: 'back-chicken.json',
  [BET_TYPE.callShotStraight]: 'call-shot-1.json',
  [BET_TYPE.callShotCut]: 'call-shot-2.json',
  [BET_TYPE.callShotThin]: 'call-shot-3.json',
  [BET_TYPE.callShotLong]: 'call-shot-4.json',
  ...Object.fromEntries(FINISH_CALLS.map((c) => [c.betType, `finish-${c.betType}.json`])),
} as Record<number, string>;

for (const [betType, file] of Object.entries(FILES)) {
  const path = resolve(DIR, file);
  writeFileSync(
    path,
    `${JSON.stringify(buildParityVectors(Number(betType) as BetType), null, 2)}\n`,
  );
  console.info(`[vectors] wrote ${path}`);
}
