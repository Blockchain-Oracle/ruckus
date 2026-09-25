// Dev helper: screenshot a page after optional actions. Usage:
//   tsx src/shoot.ts <url> <out.png> [waitMs] [w] [h] [js-to-eval-after-load]
import { launchBrowser } from './browser.ts';

const [
  url = 'http://127.0.0.1:5173/',
  out = '/tmp/shot.png',
  wait = '5000',
  w = '1280',
  h = '720',
  js = '',
] = process.argv.slice(2);
const browser = await launchBrowser();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 1,
});
await ctx.addInitScript(() => {
  localStorage.setItem('ruckus.chickenz.tutorialDone', '1');
  localStorage.setItem(
    'ruckus.profile',
    JSON.stringify({ state: { name: 'YOU', named: true }, version: 1 }),
  );
});
const page = await ctx.newPage();
const logs: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForTimeout(Number(wait));
if (js) {
  await page.evaluate(js);
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: out });
console.info(
  logs
    .filter((l) => !/THREE\.Clock|PCFSoft|AudioContext/.test(l))
    .slice(0, 20)
    .join('\n') || 'no errors',
);
await browser.close();
