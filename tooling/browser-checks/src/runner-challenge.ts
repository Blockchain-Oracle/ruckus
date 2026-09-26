// "Beat my run" end to end: a race finishes (a sharp bot drives "your" runner, fast-forwarded),
// the results board shares a challenge link, and a fresh browser opening that link sees the
// challenger's recomputed time in the hub, races their ghost, and the ghost finishes on exactly
// the tick the original run did. Needs the web dev server (:5173).
import type { Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const browser = await launchBrowser();
const open = async (url: string, name: string) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: WEB_URL });
  await ctx.addInitScript((n) => {
    localStorage.setItem(
      'ruckus.profile',
      JSON.stringify({ state: { name: n, named: true }, version: 1 }),
    );
    localStorage.setItem('ruckus.runner.controlsSeen', '1');
  }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`  [${name}] page error: ${e.message}`));
  await page.goto(url);
  return page;
};
/** Runs the race to its end in one go (60 Hz steps, no waiting on the clock). */
const fastForward = (p: Page) =>
  p.evaluate(`(() => {
    const d = globalThis.__ruckusRunner;
    for (let i = 0; i < 60 * 400 && d.world.phase !== 'over'; i++) d.update(1 / 60);
    return d.world.runners.map((r) => r.finished);
  })()`) as Promise<number[]>;

try {
  const ace = await open(`${WEB_URL}/?game=runner`, 'ACE');
  await ace.waitForFunction('globalThis.__ruckusRunner && globalThis.__ruckusMachine', undefined, {
    timeout: 20_000,
  });
  await ace.evaluate("globalThis.__ruckusMachine.getState().send('entering')");
  await ace.waitForFunction('globalThis.__ruckusRunner?.mode.kind === "race"', undefined, {
    timeout: 20_000,
  });
  await ace.evaluate('globalThis.__ruckusRunner.world.runners[0].bot = 95');
  const aceFinish = (await fastForward(ace))[0] ?? -1;
  if (aceFinish < 0) throw new Error('the recorded run did not finish');
  await ace.getByRole('button', { name: 'Challenge a friend' }).click({ timeout: 15_000 });
  const link = await ace.evaluate('navigator.clipboard.readText()');
  if (typeof link !== 'string' || !link.includes('run=')) throw new Error(`no link: ${link}`);
  console.info(`  ✓ ACE finished on tick ${aceFinish}; link ${link.length} chars`);

  const friend = await open(link, 'FRIEND');
  const beat = friend.getByRole('button', { name: /Beat ACE · \d:\d\d\.\d\d/ });
  await beat.waitFor({ timeout: 20_000 });
  console.info(`  ✓ hub offers "${(await beat.innerText()).trim()}"`);
  await beat.click();
  await friend.waitForFunction(
    'globalThis.__ruckusRunner?.mode.kind === "race" && globalThis.__ruckusRunner.world.runners.length === 2',
    undefined,
    { timeout: 20_000 },
  );
  const ghostFinish = (await fastForward(friend))[1] ?? -2;
  if (ghostFinish !== aceFinish)
    throw new Error(`ghost finished on ${ghostFinish}, the run finished on ${aceFinish}`);
  console.info(`  ✓ ACE's ghost finished on tick ${ghostFinish}, exactly as recorded`);
  if (new URL(await friend.evaluate('location.href')).searchParams.has('run'))
    throw new Error('the link kept offering the challenge after it was raced');
  console.info('runner challenge: PASS');
} catch (error) {
  console.error('runner challenge: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
