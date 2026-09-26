// Records each game's live attract for the hub landing's cabinet previews (real footage, no art).
// The DOM layer is hidden so only the canvas shows. Raw webm lands in <out>/raw; the encode step
// (assets-pipeline `encode-previews`) crops, trims and compresses it.
//   tsx src/capture-previews.ts <outDir> [seconds]
import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { launchBrowser } from './browser.ts';

const [out = '/tmp/previews', seconds = '16'] = process.argv.slice(2);
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const GAMES = ['chickenz', 'pool', 'soccer', 'runner'] as const;
const raw = join(out, 'raw');
mkdirSync(raw, { recursive: true });
const browser = await launchBrowser();
for (const id of GAMES) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: raw, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto(`${WEB_URL}/?game=${id}&capture`);
  // Only the canvas: no hub menu, top bar, vignette, toasts or jam badge.
  await page.addStyleTag({
    content: '.z-10, [data-sonner-toaster], #chain-jam-badge { display: none !important; }',
  });
  await page.waitForTimeout(Number(seconds) * 1000);
  const video = page.video();
  await ctx.close();
  const path = await video?.path();
  if (path) renameSync(path, join(raw, `${id}.webm`));
  console.info(`[previews] ${id} → ${join(raw, `${id}.webm`)}`);
}
await browser.close();
