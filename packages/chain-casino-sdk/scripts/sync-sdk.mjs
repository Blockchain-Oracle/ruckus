// Refreshes the vendored bridge sources from the upstream SDK checkout at ../../casino-sdk/src.
import { copyFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UPSTREAM_SRC = resolve(PACKAGE_ROOT, '../../casino-sdk/src');
const VENDORED_SRC = join(PACKAGE_ROOT, 'src');

for (const file of readdirSync(UPSTREAM_SRC).filter(
  (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
)) {
  copyFileSync(join(UPSTREAM_SRC, file), join(VENDORED_SRC, file));
  console.info(`[sync-sdk] ${file}`);
}
