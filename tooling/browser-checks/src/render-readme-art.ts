// Renders the README art (docs/assets/readme/src/*.html) to PNG at 2× for sharp GitHub display.
// Re-capture the game frames first with capture-stills when the games change; then shrink the
// PNGs with `pngquant --quality 75-95 --force --output <f> <f>` (about 2.6 MB → 0.7 MB each).
//   tsx src/render-readme-art.ts
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { launchBrowser } from './browser.ts';

const ART_DIR = resolve(import.meta.dirname, '../../../docs/assets/readme');
const PIECES = [
  { name: 'hero', width: 1280, height: 640 },
  { name: 'watch', width: 1280, height: 720 },
  { name: 'architecture', width: 1600, height: 960 },
] as const;

const browser = await launchBrowser();
for (const { name, width, height } of PIECES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(join(ART_DIR, 'src', `${name}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(ART_DIR, `${name}.png`) });
  await page.close();
  console.info(`${name}.png ${width * 2}×${height * 2}`);
}
await browser.close();
