// Plays the Soccer lessons with the keyboard, like a first-time player: Play → "Try it" → five
// lessons judged by the live sim → "Kick off a match". Fails if any lesson can't be passed.
// Needs the web dev server (:5173).
import type { Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const LESSON_TIMEOUT_MS = 25_000;
const SHOTS = process.env.SHOTS;

type T = { lesson: number; passed: boolean; finished: boolean; note: string | null };
type P = { x: number; y: number; bx: number; by: number; bvy: number };

const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() =>
  localStorage.setItem(
    'ruckus.profile',
    JSON.stringify({ state: { name: 'ROOKIE', named: true }, version: 1 }),
  ),
);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
const t = (p: Page) => p.evaluate('globalThis.__ruckusSoccerTutorial.getState()') as Promise<T>;
const pos = (p: Page) =>
  p.evaluate(`(() => { const w = globalThis.__ruckusSoccer.world; const y = w.players[0];
    return { x: y.x, y: y.y, bx: w.ball.x, by: w.ball.y, bvy: w.ball.vy }; })()`) as Promise<P>;
const up = async (keys: string[]) => {
  for (const k of keys) await page.keyboard.up(k);
};
/** Run one lesson with a driving routine, polling until it passes. */
async function lesson(n: number, name: string, drive: (p: P) => Promise<void>) {
  const start = Date.now();
  for (;;) {
    const s = await t(page);
    if (s.lesson > n || s.finished || (s.lesson === n && s.passed)) break;
    if (Date.now() - start > LESSON_TIMEOUT_MS)
      throw new Error(`lesson ${n + 1} (${name}) not passed`);
    if (s.lesson === n) await drive(await pos(page));
    await page.waitForTimeout(16);
  }
  await up(['KeyA', 'KeyD', 'KeyW']);
  console.info(`  ✓ lesson ${n + 1}: ${name} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-${n + 1}.png` });
  await page.waitForFunction(
    `globalThis.__ruckusSoccerTutorial.getState().lesson !== ${n} || globalThis.__ruckusSoccerTutorial.getState().finished`,
    undefined,
    { timeout: 5_000 },
  );
}
const hold = (k: string, on: boolean) => (on ? page.keyboard.down(k) : page.keyboard.up(k));
/** Run toward x (px), stopping within `tol`. */
const toward = async (p: P, x: number, tol = 12) => {
  await hold('KeyD', p.x < x - tol);
  await hold('KeyA', p.x > x + tol);
};

try {
  await page.goto(`${WEB_URL}/?game=soccer`);
  await page
    .getByRole('button', { name: /^play$/i })
    .first()
    .click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Quick lesson' }).click({ timeout: 15_000 });
  await page.waitForFunction('globalThis.__ruckusSoccerTutorial?.getState().lesson === 0');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/lesson-0.png` });

  await lesson(0, 'move', async (p) => toward(p, 260));
  await lesson(1, 'jump high', async (p) => {
    await toward(p, -40);
    await hold('KeyW', Math.abs(p.x + 40) < 30);
  });
  await lesson(2, 'shoot', async () => hold('KeyD', true));
  await lesson(3, 'header', async (p) => {
    // Stand where the ball will land, jump as it drops into reach.
    const landX = p.bx - 90 * Math.sqrt(Math.max(0, (2 * p.by) / 1200));
    await toward(p, landX - 20, 8);
    await hold('KeyW', p.by < p.y + 300 && p.by > p.y && Math.abs(p.bx - p.x) < 90);
  });
  await lesson(4, 'power-ups', async () => hold('KeyD', true));
  await page.getByRole('button', { name: 'Kick off a match' }).click({ timeout: 8_000 });
  await page.waitForFunction('globalThis.__ruckusSoccer.mode.kind === "match"');
  console.info('  ✓ finished lessons → real match');
  console.info('soccer tutorial: PASS');
} catch (error) {
  console.error('soccer tutorial: FAIL', error);
  console.error(
    'state',
    JSON.stringify(await t(page).catch(() => null)),
    JSON.stringify(await pos(page).catch(() => null)),
  );
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/tutorial-fail.png` });
  process.exitCode = 1;
} finally {
  await browser.close();
}
