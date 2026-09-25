// Loads the hub in Firefox, opens Chickenz and presses Play; reports console errors + screenshots.
import { firefox } from 'playwright-core';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const OUT = process.env.OUT ?? '/tmp';
const browser = await firefox.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(`${WEB_URL}/?game=chickenz`);
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/ff-hub.png` });
await page
  .getByRole('button', { name: 'Play', exact: true })
  .click()
  .catch((e) => errors.push(`click: ${e.message}`));
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/ff-play.png` });
console.info(errors.slice(0, 40).join('\n') || 'no console errors');
await browser.close();
