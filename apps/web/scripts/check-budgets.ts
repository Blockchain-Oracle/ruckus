#!/usr/bin/env node
/**
 * CI size budgets (S03). Reads Vite's build manifest and sums gzip sizes over import closures:
 * - shell: the entry and everything it statically imports (first paint), JS + CSS
 * - attract: what a game tile needs before its scene can render (engine + game, beyond the shell)
 * - game: the whole game chunk closure plus its emitted assets
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

type Chunk = {
  file: string;
  imports?: string[];
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
};
type Manifest = Record<string, Chunk>;

const KB = 1024;
const MB = KB * KB;
const BUDGETS = { shellGz: 150 * KB, attractGz: 1.5 * MB, game: 8 * MB } as const;
const ENGINE_KEY = 'src/engine/GameShell.tsx';
const GAME_KEY = /^src\/games\/([^/]+)\/index\.ts$/;

const dist = join(import.meta.dirname, '..', 'dist');
const manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8')) as Manifest;

const gz = new Map<string, number>();
const gzSize = (file: string) => {
  let size = gz.get(file);
  if (size === undefined) {
    size = gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;
    gz.set(file, size);
  }
  return size;
};

/** Files reachable through static imports only (dynamic imports are separate loads by design). */
function closure(key: string, seen = new Set<string>()): Set<string> {
  const chunk = manifest[key];
  if (!chunk || seen.has(key)) return seen;
  seen.add(key);
  for (const dep of chunk.imports ?? []) closure(dep, seen);
  return seen;
}

const files = (keys: Iterable<string>, withAssets = false) => {
  const out = new Set<string>();
  for (const key of keys) {
    const chunk = manifest[key];
    if (!chunk) continue;
    out.add(chunk.file);
    for (const css of chunk.css ?? []) out.add(css);
    if (withAssets) for (const asset of chunk.assets ?? []) out.add(asset);
  }
  return out;
};

const sumGz = (set: Set<string>) => [...set].reduce((n, f) => n + gzSize(f), 0);
const minus = (a: Set<string>, b: Set<string>) => new Set([...a].filter((x) => !b.has(x)));
const fmt = (bytes: number) =>
  bytes >= MB ? `${(bytes / MB).toFixed(2)} MB` : `${(bytes / KB).toFixed(1)} KB`;

const failures: string[] = [];
const check = (label: string, actual: number, budget: number) => {
  const ok = actual <= budget;
  console.info(
    `${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(28)} ${fmt(actual).padStart(10)} / ${fmt(budget)}`,
  );
  if (!ok) failures.push(label);
};

const entryKey = Object.keys(manifest).find((k) => manifest[k]?.isEntry);
if (!entryKey) throw new Error('No entry chunk in manifest');
const shell = files(closure(entryKey));
check('shell (gz)', sumGz(shell), BUDGETS.shellGz);

const engine = minus(files(closure(ENGINE_KEY)), shell);
for (const key of Object.keys(manifest)) {
  const id = GAME_KEY.exec(key)?.[1];
  if (!id) continue;
  const game = minus(files(closure(key)), shell);
  check(`${id} attract (gz)`, sumGz(new Set([...engine, ...game])), BUDGETS.attractGz);
  const withAssets = minus(files(closure(key), true), shell);
  // Browsers fetch one audio format; the AAC twins of Opus files are a fallback, not extra weight.
  const fetched = [...withAssets].filter((f) => !f.endsWith('.m4a'));
  const raw = fetched.reduce((n, f) => n + statSync(join(dist, f)).size, 0);
  check(`${id} game chunk (raw)`, raw, BUDGETS.game);
}

if (failures.length) {
  console.error(`Budget exceeded: ${failures.join(', ')}`);
  process.exit(1);
}
