// Full-HD stills of each game's live attract, plus the landing, for the README art
// (docs/assets/readme). Same `?capture` framing as capture-previews, but PNG and 1920×1080.
//   tsx src/capture-stills.ts <outDir> [settleSeconds]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { launchBrowser } from './browser.ts';

const [out = '/tmp/stills', settle = '8'] = process.argv.slice(2);
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const GAMES = ['chickenz', 'pool', 'soccer', 'runner'] as const;
/** A few frames apart, so the art step can pick the liveliest moment. */
const SHOTS_PER_GAME = 3;
const SHOT_GAP_MS = 1500;
const HIDE_DOM = '.z-10, [data-sonner-toaster], #chain-jam-badge { display: none !important; }';

mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const viewport = { width: 1920, height: 1080 };

for (const id of GAMES) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${WEB_URL}/?game=${id}&capture`);
  await page.addStyleTag({ content: HIDE_DOM });
  await page.waitForTimeout(Number(settle) * 1000);
  for (let i = 0; i < SHOTS_PER_GAME; i++) {
    await page.screenshot({ path: join(out, `${id}-${i}.png`) });
    await page.waitForTimeout(SHOT_GAP_MS);
  }
  await page.close();
  console.info(`${id}: ${SHOTS_PER_GAME} stills`);
}

const landing = await browser.newPage({ viewport });
await landing.goto(WEB_URL);
await landing.waitForTimeout(Number(settle) * 1000);
await landing.screenshot({ path: join(out, 'landing.png') });
console.info('landing: 1 still');
await browser.close();
