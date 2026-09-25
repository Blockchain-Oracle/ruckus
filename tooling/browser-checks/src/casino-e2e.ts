// S01 acceptance (browser): the casino bridge works (1) standalone → DemoHost, and (2) inside the
// Chain simulator host → real openSession → VRF → SETTLED → revealOutcome. Requires `npm start` in
// casino-sdk (harness :3300) and the web dev server on :5173.
import type { Frame, Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const SIMULATOR_URL = process.env.SIMULATOR_URL ?? 'http://localhost:3300';
const DEBUG_PATH = '/?debug=casino';
const SETTLE_TIMEOUT_MS = 30_000;
const HANDSHAKE_WAIT_MS = 15_000;

type Deployment = { games: { name: string; address: string }[] };

async function placeBetAndWaitForSettle(target: Page | Frame, label: string): Promise<void> {
  const rows = target.getByTestId('sessions').locator('tbody tr');
  const before = await rows.count();
  await target.getByTestId('place-bet').click();
  // The newest row is ours: it starts as the host's optimistic `pending:` row, then settles.
  await target.waitForFunction(
    (count) => document.querySelectorAll('[data-testid="sessions"] tbody tr').length > count,
    before,
    { timeout: SETTLE_TIMEOUT_MS },
  );
  await rows.first().filter({ hasText: 'SETTLED' }).waitFor({ timeout: SETTLE_TIMEOUT_MS });
  const row = await rows.first().innerText();
  console.info(`  ✓ ${label}: ${row.replace(/\s+/g, ' ')}`);
}

async function checkStandalone(page: Page): Promise<void> {
  console.info('standalone (no host) → DemoHost');
  await page.goto(`${WEB_URL}${DEBUG_PATH}`);
  await page.getByTestId('bridge-mode').filter({ hasText: 'mode: demo' }).waitFor();
  await placeBetAndWaitForSettle(page, 'demo round');
}

async function checkSimulator(page: Page): Promise<void> {
  console.info('inside Chain simulator host → real VRF round');
  const deployment = (await (
    await fetch(`${SIMULATOR_URL}/__local-contracts.json`)
  ).json()) as Deployment;
  const game = deployment.games.find((entry) => entry.name === 'RuckusGame');
  if (!game) throw new Error('RuckusGame not deployed in the simulator');
  const url = `${SIMULATOR_URL}/?game=${encodeURIComponent(`${WEB_URL}${DEBUG_PATH}`)}&gameAddress=${game.address}`;
  await page.goto(url);
  const frameHandle = await page.waitForSelector(`iframe[src^="${WEB_URL}"]`, {
    timeout: HANDSHAKE_WAIT_MS,
  });
  const frame = await frameHandle.contentFrame();
  if (!frame) throw new Error('game iframe did not load');
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'mode: host' })
    .waitFor({ timeout: HANDSHAKE_WAIT_MS });
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'wallet: ready' })
    .waitFor({ timeout: HANDSHAKE_WAIT_MS });
  await placeBetAndWaitForSettle(frame, 'simulator round');
}

const SIMULATOR_CONFIG_KEY = 'casino-sdk-simulator.config';

async function simulatorPage(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
  overrides: Record<string, unknown>,
): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript(
    ([key, value]) => {
      if (location.port === '3300') localStorage.setItem(key, value);
    },
    [SIMULATOR_CONFIG_KEY, JSON.stringify(overrides)] as const,
  );
  return context.newPage();
}

async function openGameFrame(page: Page): Promise<Frame> {
  const deployment = (await (
    await fetch(`${SIMULATOR_URL}/__local-contracts.json`)
  ).json()) as Deployment;
  const game = deployment.games.find((entry) => entry.name === 'RuckusGame');
  if (!game) throw new Error('RuckusGame not deployed in the simulator');
  await page.goto(
    `${SIMULATOR_URL}/?game=${encodeURIComponent(`${WEB_URL}${DEBUG_PATH}`)}&gameAddress=${game.address}`,
  );
  const handle = await page.waitForSelector(`iframe[src^="${WEB_URL}"]`, {
    timeout: HANDSHAKE_WAIT_MS,
  });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('game iframe did not load');
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'mode: host' })
    .waitFor({ timeout: HANDSHAKE_WAIT_MS });
  return frame;
}

async function checkWalletNotReady(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
): Promise<void> {
  console.info('unhappy path: wallet disconnected');
  const page = await simulatorPage(browser, { walletStatus: 'disconnected' });
  const frame = await openGameFrame(page);
  await frame.getByTestId('wallet-not-ready').waitFor({ timeout: HANDSHAKE_WAIT_MS });
  if (!(await frame.getByTestId('place-bet').isDisabled()))
    throw new Error('bet button enabled while wallet not ready');
  console.info('  ✓ betting disabled, not-ready state shown');
  await page.context().close();
}

async function checkSlowIndexer(browser: Awaited<ReturnType<typeof launchBrowser>>): Promise<void> {
  console.info('unhappy path: slow indexer (4 s lag)');
  const page = await simulatorPage(browser, { indexerLagMs: 4_000 });
  const frame = await openGameFrame(page);
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'wallet: ready' })
    .waitFor({ timeout: HANDSHAKE_WAIT_MS });
  await placeBetAndWaitForSettle(frame, 'lagged round');
  await page.context().close();
}

/** Highest settled-or-open session id visible in the table (`<chainId>:<id>` keys; pending rows ignored). */
async function newestSessionId(frame: Frame): Promise<number> {
  return frame.evaluate(() =>
    Math.max(
      0,
      ...Array.from(document.querySelectorAll('[data-testid="sessions"] tbody tr td:first-child'))
        .map((cell) => /^\d+:(\d+)$/.exec(cell.textContent ?? '')?.[1])
        .filter((id): id is string => id !== undefined)
        .map(Number),
    ),
  );
}

async function checkRefreshMidRound(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
): Promise<void> {
  console.info('unhappy path: refresh mid-round');
  const page = await simulatorPage(browser, {});
  let frame = await openGameFrame(page);
  await frame
    .getByTestId('bridge-mode')
    .filter({ hasText: 'wallet: ready' })
    .waitFor({ timeout: HANDSHAKE_WAIT_MS });
  const lastSeen = await newestSessionId(frame);
  await frame.getByTestId('place-bet').click();
  // Wait until the bet is on-chain (a real session id replaces the optimistic pending row), then
  // refresh the whole page: host and game must rebuild the round from chain/indexer state alone.
  // (The host binds to the iframe element, so the game must never reload itself — see HANDOFF gotchas.)
  const hasSession = (settledOnly: boolean) =>
    frame.waitForFunction(
      ([previous, requireSettled]) =>
        Array.from(document.querySelectorAll('[data-testid="sessions"] tbody tr')).some((row) => {
          const id = Number(
            /^\d+:(\d+)$/.exec(row.querySelector('td')?.textContent ?? '')?.[1] ?? 0,
          );
          return id > previous && (!requireSettled || row.textContent?.includes('SETTLED'));
        }),
      [lastSeen, settledOnly] as const,
      { timeout: SETTLE_TIMEOUT_MS },
    );
  await hasSession(false);
  await page.reload();
  frame = await openGameFrame(page);
  await hasSession(true);
  console.info(`  ✓ session ${lastSeen + 1} recovered after reload and settled`);
  await page.context().close();
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`  page error: ${error.message}`));
  await checkStandalone(page);
  await checkSimulator(page);
  await checkWalletNotReady(browser);
  await checkSlowIndexer(browser);
  await checkRefreshMidRound(browser);
  console.info('casino e2e: PASS');
} catch (error) {
  console.error('casino e2e: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
