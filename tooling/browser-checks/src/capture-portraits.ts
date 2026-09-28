// Chicken portraits for the HUD (ScoreBar, seats, landing): one head per player colour, rendered
// by the real engine on a transparent canvas (?debug=portrait), then encoded to 256² WebP.
//   tsx src/capture-portraits.ts [outDir]   (web dev server on :5173; needs cwebp)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium } from 'playwright-core';

const out = process.argv[2] ?? '../../apps/web/src/assets/portraits';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
/** Seat order, matching ui/game/players.ts. */
const NAMES = ['tomato', 'teal', 'violet', 'lime'] as const;
const PX = 256;

mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'portraits-'));
const b = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-unsafe-webgpu'],
});
const errors: string[] = [];
for (const [i, name] of NAMES.entries()) {
  const p = await b.newPage({ viewport: { width: PX, height: PX }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${WEB_URL}/?debug=portrait&player=${i}`);
  // The jam badge (index.html's widget) floats over every page.
  await p.addStyleTag({
    content:
      '#chain-jam-badge { display: none !important; } html, body { background: transparent !important; }',
  });
  await p.waitForFunction(() => document.body.dataset.portraitReady === '1', null, {
    timeout: 60000,
  });
  await p.waitForTimeout(800);
  const png = join(work, `${name}.png`);
  await p.screenshot({ path: png, omitBackground: true });
  execFileSync('cwebp', [
    '-quiet',
    '-q',
    '88',
    '-alpha_q',
    '100',
    '-resize',
    String(PX),
    String(PX),
    png,
    '-o',
    join(out, `chicken-${name}.webp`),
  ]);
  console.info(`chicken-${name}.webp`);
  await p.close();
}
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
