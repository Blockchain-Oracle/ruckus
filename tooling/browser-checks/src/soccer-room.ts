// Real browsers in a Soccer room: the host creates it in the UI; a friend opens the invite link in
// the lobby; the host adds a bot and starts (three seats → 2v2, a labelled bot fills the gap).
// Both play with the keyboard; a watcher joins mid-match. While the match runs, every client's
// predicted world must track the others (ball within a tolerance), and all must agree on the score
// and full time. Afterwards the room returns to its lobby.
// Needs the web dev server (:5173) and a local game server (:2567). Takes the full 90 s match.
import type { Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
/** Two clients see the ball at slightly different moments (latency, prediction): px of slack. */
const BALL_TOLERANCE_PX = 120;
/** Most samples must agree; a hard hit mid-correction can briefly exceed the slack. */
const AGREE_SHARE = 0.9;

type View = {
  mode: string;
  slot: number;
  phase: string;
  score: [number, number];
  ball: { x: number; y: number };
  players: number;
  tick: number;
};

const browser = await launchBrowser();
const open = async (url: string, name: string) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript((n) => {
    localStorage.setItem(
      'ruckus.profile',
      JSON.stringify({ state: { name: n, named: true }, version: 1 }),
    );
    localStorage.setItem('ruckus.soccer.controlsSeen', '1');
  }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`  [${name}] page error: ${e.message}`));
  await page.goto(url);
  return page;
};
const view = (p: Page) =>
  p.evaluate(`(() => {
    const d = globalThis.__ruckusSoccer;
    const w = d.world;
    return { mode: d.mode.kind, slot: d.humanSlot, phase: w.phase, score: [...w.score],
      ball: { x: w.ball.x, y: w.ball.y }, players: w.players.length, tick: w.tick };
  })()`) as Promise<View>;
const waitOnline = (p: Page) =>
  p.waitForFunction('globalThis.__ruckusSoccer?.mode.kind === "online"', undefined, {
    timeout: 20_000,
  });

try {
  const host = await open(`${WEB_URL}/?game=soccer`, 'HOST');
  await host.getByRole('button', { name: 'Play with friends' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Create room' }).click();
  const codeEl = host.locator('.select-all');
  await codeEl.waitFor({ timeout: 15_000 });
  const code = (await codeEl.innerText()).trim();
  console.info(`room ${code}`);

  const friend = await open(`${WEB_URL}/?game=soccer&room=${code}`, 'FRIEND');
  await host.getByText('FRIEND', { exact: true }).first().waitFor({ timeout: 30_000 });
  await friend.getByRole('button', { name: 'Ready up' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Add bot' }).click();
  await host
    .getByText(/Bot · /)
    .first()
    .waitFor({ timeout: 10_000 });
  if (process.env.DEBUG_ROOM)
    console.info('lobby:', JSON.stringify(await host.locator('[role=dialog]').innerText()));
  await host.getByRole('button', { name: 'Start' }).click();
  await Promise.all([waitOnline(host), waitOnline(friend)]);
  const [h0, f0] = [await view(host), await view(friend)];
  if (h0.players !== 4 || f0.players !== 4) {
    const names = await host.evaluate('JSON.stringify(document.body.innerText.slice(0, 400))');
    throw new Error(`expected 2v2, got ${h0.players} / ${f0.players}; host sees ${names}`);
  }
  if (h0.slot < 0 || f0.slot < 0 || h0.slot === f0.slot)
    throw new Error(`bad seats host ${h0.slot} friend ${f0.slot}`);
  console.info(`  ✓ 2v2 started: host seat ${h0.slot}, friend seat ${f0.slot}, bot fills the gap`);

  // Both players run at the ball and jump now and then (a real, messy match).
  const drive = async (p: Page, keys: string[]) => {
    for (const k of keys) await p.keyboard.down(k);
  };
  await drive(host, ['KeyD']);
  await drive(friend, ['KeyA']);

  const watcher = await open(`${WEB_URL}/?game=soccer&room=${code}`, 'WATCHER');
  await waitOnline(watcher);
  const w0 = await view(watcher);
  if (w0.slot !== -1) throw new Error(`watcher got seat ${w0.slot}`);
  console.info('  ✓ watcher joined mid-match and sees it live');

  // Mid-match the friend walks out: a labelled bot must take their egg on every client.
  await host.waitForTimeout(8_000);
  await host.screenshot({ path: process.env.SHOT ?? '/tmp/soccer-room.png' });
  await friend.getByRole('button', { name: 'Leave match' }).click();
  await host.waitForFunction(
    `globalThis.__ruckusSoccer.world.players[${f0.slot}].bot >= 0`,
    undefined,
    { timeout: 10_000 },
  );
  console.info('  ✓ friend left mid-match: a labelled bot took their egg');

  let samples = 0;
  let agree = 0;
  let worst = 0;
  for (;;) {
    await host.waitForTimeout(500);
    await host.keyboard.press('KeyW');
    const [a, b, c] = [await view(host), await view(watcher), await view(watcher)];
    if (a.phase === 'over' && b.phase === 'over' && c.phase === 'over') {
      if (`${a.score}` !== `${b.score}` || `${a.score}` !== `${c.score}`)
        throw new Error(`final scores differ: ${a.score} / ${b.score} / ${c.score}`);
      console.info(`  ✓ full time on every client, same score ${a.score.join('-')}`);
      break;
    }
    if (a.phase !== 'play' || b.phase !== 'play') continue;
    const d = Math.max(
      Math.hypot(a.ball.x - b.ball.x, a.ball.y - b.ball.y),
      Math.hypot(a.ball.x - c.ball.x, a.ball.y - c.ball.y),
    );
    worst = Math.max(worst, d);
    samples += 1;
    if (d <= BALL_TOLERANCE_PX) agree += 1;
  }
  const share = agree / Math.max(1, samples);
  console.info(
    `  ✓ ball tracked across clients in ${agree}/${samples} samples (worst ${worst.toFixed(0)} px)`,
  );
  if (share < AGREE_SHARE) throw new Error(`clients diverged: only ${(share * 100).toFixed(0)}%`);

  await host.getByText(`Room ${code}`).waitFor({ timeout: 20_000 });
  console.info('  ✓ room back in its lobby after full time');
  console.info('soccer room: PASS');
} catch (error) {
  console.error('soccer room: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
