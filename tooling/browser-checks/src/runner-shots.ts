// Dev helper: attract + in-race screenshots of Neon Dash. Usage: tsx src/runner-shots.ts <outDir> [w] [h]
import { launchBrowser } from './browser.ts';

const [out = '/tmp', w = '1280', h = '720'] = process.argv.slice(2);
const browser = await launchBrowser();
// RUNNER_TOUCH=1 emulates a phone (coarse pointer → swipe wording).
const touch = process.env.RUNNER_TOUCH === '1';
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  hasTouch: touch,
  isMobile: touch,
});
await ctx.addInitScript(() => {
  if (!location.search.includes('intro')) localStorage.setItem('ruckus.runner.controlsSeen', '1');
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
const intro = process.env.RUNNER_INTRO === '1' ? '&intro' : '';
await page.goto(
  `${process.env.RUNNER_URL ?? 'http://127.0.0.1:5173/'}?game=runner&preview${intro}`,
);
await page.waitForTimeout(7000);
await page.screenshot({ path: `${out}/runner-attract.png` });
await page.evaluate("window.__ruckusMachine?.getState?.().send('entering')");
await page.waitForTimeout(2200);
await page.screenshot({ path: `${out}/runner-countdown.png` });
if (intro) {
  await browser.close();
  process.exit(0);
}
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/runner-run.png` });
await page.keyboard.press('KeyA');
await page.waitForTimeout(120);
await page.keyboard.press('KeyW');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/runner-jump.png` });
await page.keyboard.down('KeyS');
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/runner-slide.png` });
await page.keyboard.up('KeyS');
const state = await page.evaluate(
  'JSON.stringify({phase: __ruckusRunner.world.phase, me: (({s, lane, y, coins, out, power}) => ({s, lane, y, coins, out, power}))(__ruckusRunner.world.runners[0]), mode: __ruckusRunner.mode})',
);
console.info(state);
await page.waitForTimeout(8000);
await page.screenshot({ path: `${out}/runner-later.png` });
// Jump to near the line: FINISH! → results board.
await page.evaluate('__ruckusRunner.world.runners.forEach((r, i) => { r.s = 2960 - i * 12; })');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/runner-finish.png` });
await page.waitForTimeout(16000);
await page.screenshot({ path: `${out}/runner-results.png` });
console.info(
  await page.evaluate(
    'JSON.stringify({ phase: __ruckusRunner.world.phase, fin: __ruckusRunner.world.runners.map(r => r.finished) })',
  ),
);
console.info('race again:', await page.getByRole('button', { name: 'Race again' }).count());
console.info(
  logs
    .filter((l) => !/THREE\.Clock|PCFSoft|AudioContext/.test(l))
    .slice(0, 20)
    .join('\n') || 'no errors',
);
await browser.close();
