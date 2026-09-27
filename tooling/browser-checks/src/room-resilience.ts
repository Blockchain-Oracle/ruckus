// S34 acceptance (Codex UX #1): seats belong to players, not sockets. In a Neon Dash room:
//  1. the friend reloads mid-race and is back in their own runner (not a watcher, no bot);
//  2. the friend's tab dies, the grace runs out and a labelled bot takes over; the friend
//     returns on a fresh tab (same device id) and takes the runner back from the bot;
//  3. after the race the lobby holds exactly host + friend + the invited bot: no "Bot (Name)".
// Needs the web dev server (:5173) and a local game server (:2567). Takes ~2.5 min.
import type { BrowserContext, Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
/** The server's match grace (apps/server/src/rooms/lobby.ts GRACE_MATCH_S) plus ping detection. */
const TAKEOVER_WAIT_MS = 45_000;
const FRIEND_ID = 'resilience-friend-0001';

const browser = await launchBrowser();
const context = async (name: string, playerId?: string) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(
    ([n, id]) => {
      localStorage.setItem(
        'ruckus.profile',
        JSON.stringify({ state: { name: n, named: true }, version: 1 }),
      );
      localStorage.setItem('ruckus.runner.controlsSeen', '1');
      if (id) localStorage.setItem('ruckus.playerId', id);
    },
    [name, playerId ?? ''] as const,
  );
  return ctx;
};
const open = async (ctx: BrowserContext, url: string, name: string) => {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`  [${name}] page error: ${e.message}`));
  await page.goto(url);
  return page;
};
const slotOf = (p: Page) =>
  p.evaluate('globalThis.__ruckusRunner?.humanSlot ?? -2') as Promise<number>;
const botOf = (p: Page, slot: number) =>
  p.evaluate(`globalThis.__ruckusRunner.world.runners[${slot}].bot`) as Promise<number>;
const waitOnline = (p: Page) =>
  p.waitForFunction('globalThis.__ruckusRunner?.mode.kind === "online"', undefined, {
    timeout: 30_000,
  });

try {
  const host = await open(await context('HOST'), `${WEB_URL}/?game=runner`, 'HOST');
  await host.getByRole('button', { name: 'Play with friends' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Create room' }).click();
  const codeEl = host.locator('.select-all');
  await codeEl.waitFor({ timeout: 15_000 });
  const code = (await codeEl.innerText()).trim();
  const invite = `${WEB_URL}/?game=runner&room=${code}`;
  console.info(`room ${code}`);

  const friendCtx = await context('FRIEND', FRIEND_ID);
  let friend = await open(friendCtx, invite, 'FRIEND');
  await host.getByText('FRIEND', { exact: true }).first().waitFor({ timeout: 30_000 });
  await friend.getByRole('button', { name: 'Ready up' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Add bot' }).click();
  await host
    .getByText(/Bot · /)
    .first()
    .waitFor({ timeout: 10_000 });
  await host.getByRole('button', { name: 'Start' }).click();
  await Promise.all([waitOnline(host), waitOnline(friend)]);
  const seat = await slotOf(friend);
  if (seat < 0) throw new Error('friend has no runner');
  console.info(`  ✓ race on: friend runs slot ${seat}`);

  // 1. Reload mid-race.
  await host.waitForTimeout(4000);
  await friend.reload();
  await waitOnline(friend);
  await friend.waitForFunction(`globalThis.__ruckusRunner.humanSlot === ${seat}`, undefined, {
    timeout: 20_000,
  });
  if ((await botOf(host, seat)) >= 0) throw new Error('a bot holds the reloaded seat');
  console.info(`  ✓ reload: friend is back in slot ${seat}, no bot, not a watcher`);

  // 2. The tab dies; after the grace a labelled bot runs; the friend comes back on a new tab.
  await friendCtx.close();
  await host.waitForFunction(
    `globalThis.__ruckusRunner.world.runners[${seat}].bot >= 0`,
    undefined,
    {
      timeout: TAKEOVER_WAIT_MS,
    },
  );
  console.info('  ✓ tab gone past the grace: a labelled bot took the runner');
  friend = await open(await context('FRIEND', FRIEND_ID), invite, 'FRIEND');
  await waitOnline(friend);
  await friend.waitForFunction(`globalThis.__ruckusRunner.humanSlot === ${seat}`, undefined, {
    timeout: 20_000,
  });
  await host.waitForFunction(
    `globalThis.__ruckusRunner.world.runners[${seat}].bot < 0`,
    undefined,
    {
      timeout: 10_000,
    },
  );
  console.info(`  ✓ friend returned on a new tab and took slot ${seat} back from the bot`);

  // 3. Back in the lobby: no phantom seats.
  await host.waitForFunction('globalThis.__ruckusRunner.world.phase === "over"', undefined, {
    timeout: 240_000,
  });
  await host.getByText(`Room ${code}`).waitFor({ timeout: 30_000 });
  const names = (await host.locator('[role="dialog"] li').allInnerTexts()) as string[];
  const flat = names.join(' | ');
  if (/Bot \(/.test(flat)) throw new Error(`a takeover bot is still seated: ${flat}`);
  if (!/HOST/.test(flat) || !/FRIEND/.test(flat)) throw new Error(`lobby lost a player: ${flat}`);
  console.info(`  ✓ lobby after the race: ${flat.replace(/\s+/g, ' ')}`);
  console.info('room resilience: PASS');
} catch (err) {
  console.error('room resilience: FAIL', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
