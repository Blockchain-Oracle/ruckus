// Real browsers in a Runner room: the host creates it in the UI; a friend opens the invite link;
// the host adds two bots and starts a four-runner race on one course. Both humans steer with the
// keyboard; a watcher joins mid-race; the friend walks out and a labelled bot takes their runner.
// Every client's predicted race must track the others (each runner's distance within a tolerance)
// and all must agree on the finishing order. Afterwards the room returns to its lobby.
// Needs the web dev server (:5173) and a local game server (:2567). Takes a full race (~2 min).
import type { Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
/** Two clients see a runner at slightly different moments (latency, prediction): metres of slack. */
const DISTANCE_TOLERANCE_M = 4;
const AGREE_SHARE = 0.9;

type View = { mode: string; slot: number; phase: string; s: number[]; order: number[] };

const browser = await launchBrowser();
const open = async (url: string, name: string) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
const view = (p: Page) =>
  p.evaluate(`(() => {
    const d = globalThis.__ruckusRunner;
    const w = d.world;
    const order = w.runners.map((_, i) => i).sort((a, b) => {
      const ra = w.runners[a], rb = w.runners[b];
      const k = (r) => (r.finished >= 0 ? r.finished : Infinity);
      return k(ra) - k(rb) || rb.s - ra.s || a - b;
    });
    return { mode: d.mode.kind, slot: d.humanSlot, phase: w.phase, s: w.runners.map((r) => r.s), order };
  })()`) as Promise<View>;
const waitOnline = (p: Page) =>
  p.waitForFunction('globalThis.__ruckusRunner?.mode.kind === "online"', undefined, {
    timeout: 20_000,
  });

try {
  const host = await open(`${WEB_URL}/?game=runner`, 'HOST');
  await host.getByRole('button', { name: 'Online' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Create room' }).click();
  const codeEl = host.locator('.select-all');
  await codeEl.waitFor({ timeout: 15_000 });
  const code = (await codeEl.innerText()).trim();
  console.info(`room ${code}`);

  const friend = await open(`${WEB_URL}/?game=runner&room=${code}`, 'FRIEND');
  await host.getByText('FRIEND', { exact: true }).first().waitFor({ timeout: 30_000 });
  await friend.getByRole('button', { name: 'Ready up' }).click({ timeout: 20_000 });
  for (let i = 0; i < 2; i++) await host.getByRole('button', { name: 'Add bot' }).click();
  await host
    .getByText(/Bot · /)
    .nth(1)
    .waitFor({ timeout: 10_000 });
  await host.getByRole('button', { name: 'Start' }).click();
  await Promise.all([waitOnline(host), waitOnline(friend)]);
  const [h0, f0] = [await view(host), await view(friend)];
  if (h0.s.length !== 4 || f0.s.length !== 4)
    throw new Error(`expected 4 runners, got ${h0.s.length} / ${f0.s.length}`);
  if (h0.slot < 0 || f0.slot < 0 || h0.slot === f0.slot)
    throw new Error(`bad seats host ${h0.slot} friend ${f0.slot}`);
  console.info(`  ✓ 4-runner race: host ${h0.slot}, friend ${f0.slot}, two labelled bots`);

  const watcher = await open(`${WEB_URL}/?game=runner&room=${code}`, 'WATCHER');
  await waitOnline(watcher);
  if ((await view(watcher)).slot !== -1) throw new Error('watcher got a seat');
  console.info('  ✓ watcher joined mid-race and sees it live');

  // Humans weave and hop (a real, messy run); the friend walks out after a while.
  const weave = async (p: Page, k: number) => {
    await p.keyboard.press(k % 3 === 0 ? 'KeyW' : k % 2 ? 'KeyA' : 'KeyD');
  };
  let samples = 0;
  let agree = 0;
  let worst = 0;
  let k = 0;
  let friendGone = false;
  for (;;) {
    await host.waitForTimeout(500);
    k += 1;
    await weave(host, k);
    if (!friendGone) await weave(friend, k + 1);
    if (!friendGone && k === 16) {
      await host.screenshot({ path: process.env.SHOT ?? '/tmp/runner-room.png' });
      await friend.getByRole('button', { name: 'Leave race' }).click();
      await host.waitForFunction(
        `globalThis.__ruckusRunner.world.runners[${f0.slot}].bot >= 0`,
        undefined,
        { timeout: 10_000 },
      );
      friendGone = true;
      console.info('  ✓ friend left mid-race: a labelled bot took their runner');
    }
    const [a, b] = [await view(host), await view(watcher)];
    if (a.phase === 'over' && b.phase === 'over') {
      if (`${a.order}` !== `${b.order}`)
        throw new Error(`finishing orders differ: ${a.order} / ${b.order}`);
      console.info(`  ✓ race over on every client, same order ${a.order.join(' > ')}`);
      break;
    }
    if (a.phase !== 'run' || b.phase !== 'run') continue;
    const d = Math.max(...a.s.map((s, i) => Math.abs(s - (b.s[i] ?? 0))));
    worst = Math.max(worst, d);
    samples += 1;
    if (d <= DISTANCE_TOLERANCE_M) agree += 1;
  }
  const share = agree / Math.max(1, samples);
  console.info(
    `  ✓ runners tracked across clients in ${agree}/${samples} samples (worst ${worst.toFixed(1)} m)`,
  );
  if (share < AGREE_SHARE) throw new Error(`clients diverged: only ${(share * 100).toFixed(0)}%`);
  await host.getByText(`Room ${code}`).waitFor({ timeout: 20_000 });
  console.info('  ✓ room back in its lobby after the race');
  console.info('runner room: PASS');
} catch (error) {
  console.error('runner room: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
