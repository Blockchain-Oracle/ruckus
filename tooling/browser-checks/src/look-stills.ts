// Stills of every scene's attract (the four games) for look work: compare tiers, viewports
// and a before/after (WEB_URL=https://playruckus.xyz for the live build). Also fails on page
// errors, so a broken post pipeline shows up as a failure rather than a black frame.
//   tsx src/look-stills.ts <outDir> [tiers=high] [viewports=desktop,phone]
//   e.g. tsx src/look-stills.ts /tmp/look high,low,off desktop
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { launchBrowser } from './browser.ts';

const [out = '/tmp/look-stills', tierArg = 'high', viewportArg = 'desktop,phone'] =
  process.argv.slice(2);
const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const EXTRA = process.env.LOOK_QUERY ?? '';
const SCENES = (process.env.SCENES?.split(',') ?? [
  'chickenz',
  'pool',
  'soccer',
  'runner',
]) as readonly string[];
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844 },
} as const;
const SETTLE_MS = 6000;
const HIDE_DOM = '.z-10, [data-sonner-toaster], #chain-jam-badge { display: none !important; }';

mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
let failures = 0;

for (const vpName of viewportArg.split(',') as (keyof typeof VIEWPORTS)[]) {
  for (const tier of tierArg.split(',')) {
    for (const scene of SCENES) {
      const page = await browser.newPage({ viewport: VIEWPORTS[vpName] });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      const game = `game=${scene}&`;
      await page.goto(`${WEB_URL}/?${game}capture&look=${tier}${EXTRA}`);
      await page.addStyleTag({ content: HIDE_DOM });
      await page.waitForTimeout(SETTLE_MS);
      const file = join(out, `${scene}-${tier}-${vpName}.png`);
      await page.screenshot({ path: file });
      await page.close();
      const bad = errors.filter((e) => !/favicon|widget\.js|ERR_/.test(e));
      if (bad.length) failures += 1;
      console.info(
        `${bad.length ? 'FAIL' : 'ok  '} ${file}${bad.length ? `\n  ${bad.join('\n  ')}` : ''}`,
      );
    }
  }
}
await browser.close();
if (failures) {
  console.error(`${failures} scene(s) logged errors`);
  process.exit(1);
}
