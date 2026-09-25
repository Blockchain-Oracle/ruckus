import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { loadChickenzSync } from '@arena/sim-chickenz';

let loaded = false;

/** The server runs the exact wasm build the browser runs (determinism is the netcode's contract). */
export function ensureChickenzWasm() {
  if (loaded) return;
  const require = createRequire(import.meta.url);
  loadChickenzSync(readFileSync(require.resolve('@arena/sim-chickenz/wasm')));
  loaded = true;
}
