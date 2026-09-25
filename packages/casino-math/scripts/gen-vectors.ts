// Writes contracts/vectors/back-chicken.json, which the Foundry parity test replays against Solidity.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildParityVectors } from '../src/index.ts';

export const VECTORS_PATH = resolve(
  import.meta.dirname,
  '../../../contracts/vectors/back-chicken.json',
);

writeFileSync(VECTORS_PATH, `${JSON.stringify(buildParityVectors(), null, 2)}\n`);
console.info(`[vectors] wrote ${VECTORS_PATH}`);
