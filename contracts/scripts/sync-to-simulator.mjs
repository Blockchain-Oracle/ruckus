// Copies contracts/src/*Game.sol into the Chain simulator's watched folder, which compiles,
// deploys and registers every ICasinoGameV2 it finds (ADR-004). Copies rather than symlinks
// because the simulator's fs.watch does not follow links reliably. `--watch` keeps syncing.
import { copyFileSync, readdirSync, watch } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTRACTS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(CONTRACTS_ROOT, 'src');
const SIMULATOR_DIR = resolve(CONTRACTS_ROOT, '../casino-sdk/simulator/contracts');
const GAME_FILE = /Game\.sol$/;
const WATCH_DEBOUNCE_MS = 150;

function syncAll() {
  for (const file of readdirSync(SOURCE_DIR).filter((name) => GAME_FILE.test(name))) {
    copyFileSync(join(SOURCE_DIR, file), join(SIMULATOR_DIR, file));
    console.info(`[contracts:sync] ${file} → casino-sdk/simulator/contracts/`);
  }
}

syncAll();

if (process.argv.includes('--watch')) {
  let timer;
  watch(SOURCE_DIR, (_event, file) => {
    if (!file || !GAME_FILE.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(syncAll, WATCH_DEBOUNCE_MS);
  });
  console.info('[contracts:sync] watching contracts/src for changes…');
}
