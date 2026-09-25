// Dev helper: attract + in-match screenshots of Soccer. Usage: tsx src/soccer-shots.ts <outDir> [w] [h]
import { launchBrowser } from './browser.ts';

const [out = '/tmp', w = '1280', h = '720'] = process.argv.slice(2);
const browser = await launchBrowser();
// SOCCER_TOUCH=1 emulates a phone (coarse pointer → touch buttons); SOCCER_2V2=1 plays 2v2.
const touch = process.env.SOCCER_TOUCH === '1';
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  hasTouch: touch,
  isMobile: touch,
});
if (process.env.SOCCER_2V2 === '1')
  await ctx.addInitScript(() =>
    localStorage.setItem(
      'ruckus.soccer.prefs',
      JSON.stringify({ state: { perTeam: 2, level: 'pro' }, version: 1 }),
    ),
  );
await ctx.addInitScript(() => {
  localStorage.setItem('ruckus.soccer.controlsSeen', '1');
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
await page.goto(`${process.env.SOCCER_URL ?? 'http://127.0.0.1:5173/'}?game=soccer`);
await page.waitForTimeout(6000);
await page.screenshot({ path: `${out}/soccer-attract.png` });
await page.evaluate("window.__ruckusMachine?.getState?.().send('entering')");
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/soccer-countdown.png` });
await page.keyboard.down('KeyD');
await page.waitForTimeout(1800);
await page.keyboard.press('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyD');
await page.screenshot({ path: `${out}/soccer-play.png` });
const state = await page.evaluate(
  'JSON.stringify({phase: __ruckusSoccer.world.phase, score: __ruckusSoccer.world.score, ball: __ruckusSoccer.world.ball, p0: __ruckusSoccer.world.players[0].x, mode: __ruckusSoccer.mode})',
);
console.info(state);
// Score a goal, then run the clock down: GOAL! → FULL TIME → results card.
await page.evaluate('Object.assign(__ruckusSoccer.world.ball, { x: 600, y: 60, vx: 300, vy: 0 })');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/soccer-goal.png` });
await page.waitForTimeout(3500);
await page.evaluate('__ruckusSoccer.world.clock = 90');
await page.waitForTimeout(5500);
await page.screenshot({ path: `${out}/soccer-results.png` });
console.info(
  await page.evaluate(
    'JSON.stringify({ phase: __ruckusSoccer.world.phase, score: __ruckusSoccer.world.score })',
  ),
);
console.info('rematch button:', await page.getByRole('button', { name: 'Rematch' }).count());
console.info(
  logs
    .filter((l) => !/THREE\.Clock|PCFSoft|AudioContext/.test(l))
    .slice(0, 20)
    .join('\n') || 'no errors',
);
await browser.close();
