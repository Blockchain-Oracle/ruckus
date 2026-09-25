// S10a acceptance: Back a Bird end to end inside the Chain simulator host, through the real hub UI.
// Every round: bet → WAITING_RANDOMNESS → SETTLED → the presented fight is the canonical bank
// exhibition (live state hash = headless run) whose class equals the settled class, and the payout
// is stake × that class's multiplier. Rounds repeat until the top multiplier (flawless, 6×) lands.
// Needs `npm start` in casino-sdk (:3300) and the web dev server on :5173 (DEV handles).
import type { Frame } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const SIMULATOR_URL = process.env.SIMULATOR_URL ?? 'http://localhost:3300';
/** Flawless is 1 in 20: 90 rounds miss it with probability 0.95^90 ≈ 1%. */
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS ?? 90);
const HANDSHAKE_MS = 20_000;
const ROUND_MS = 45_000;
const TOP_CLASS = 0;
/** Mirrors the contract class table (casino-math `BET_TABLES`), in basis points. */
const MULTIPLIER_BPS = [60_000n, 28_000n, 4_000n, 0n] as const;
const CLASS_NAMES = ['flawless', 'win', 'runner-up', 'lose'] as const;

type Deployment = { games: { name: string; address: string }[] };
type FightRecord = {
  sessionId: string;
  settledClass: number;
  presentedClass: number;
  liveHash: string;
  canonicalHash: string;
  payout: string;
  wager: string;
};

async function openChickenz(page: Awaited<ReturnType<typeof newPage>>): Promise<Frame> {
  const deployment = (await (
    await fetch(`${SIMULATOR_URL}/__local-contracts.json`)
  ).json()) as Deployment;
  const game = deployment.games.find((g) => g.name === 'RuckusGame');
  if (!game) throw new Error('RuckusGame not deployed in the simulator');
  const gameUrl = `${WEB_URL}/?game=chickenz`;
  await page.goto(
    `${SIMULATOR_URL}/?game=${encodeURIComponent(gameUrl)}&gameAddress=${game.address}`,
  );
  const handle = await page.waitForSelector(`iframe[src^="${WEB_URL}"]`, { timeout: HANDSHAKE_MS });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('game iframe did not load');
  await frame.getByRole('button', { name: 'Back a Bird' }).waitFor({ timeout: HANDSHAKE_MS });
  return frame;
}

async function newPage(browser: Awaited<ReturnType<typeof launchBrowser>>) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
  return page;
}

async function playRound(frame: Frame, round: number): Promise<FightRecord> {
  const previous = await frame.evaluate(
    () => (globalThis as { __ruckusFight?: { sessionId: string } }).__ruckusFight?.sessionId ?? '',
  );
  const sheetOpen = await frame.evaluate(
    () =>
      (
        globalThis as { __ruckusWager?: { getState(): { sheetOpen: boolean } } }
      ).__ruckusWager?.getState().sheetOpen === true,
  );
  if (!sheetOpen) await frame.getByRole('button', { name: 'Back a Bird' }).click();
  const place = frame.getByRole('button', { name: /^Back .* win up to/ });
  await place.waitFor({ timeout: HANDSHAKE_MS });
  // The host wallet handshake can lag the sheet: wait for the button to arm.
  await frame.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('button')).some(
        (b) => /^Back .* win up to/.test(b.textContent ?? '') && !b.disabled,
      ),
    undefined,
    { timeout: HANDSHAKE_MS },
  );
  await place.click();
  // Presented fight: skip to its end (the sim runs the remaining ticks at once).
  await frame.getByRole('button', { name: 'Skip' }).click({ timeout: ROUND_MS });
  await frame.waitForFunction(
    (prev) => {
      const f = (globalThis as { __ruckusFight?: { sessionId: string } }).__ruckusFight;
      return f !== undefined && f.sessionId !== prev;
    },
    previous,
    { timeout: ROUND_MS },
  );
  const fight = await frame.evaluate(
    () => (globalThis as unknown as { __ruckusFight: FightRecord }).__ruckusFight,
  );
  await frame.getByRole('dialog', { name: 'Round result' }).waitFor({ timeout: ROUND_MS });

  const expected = (BigInt(fight.wager) * (MULTIPLIER_BPS[fight.settledClass] ?? 0n)) / 10_000n;
  const problems = [
    fight.presentedClass !== fight.settledClass &&
      `presented class ${fight.presentedClass} ≠ settled ${fight.settledClass}`,
    fight.liveHash !== fight.canonicalHash &&
      `live hash ${fight.liveHash} ≠ canonical ${fight.canonicalHash}`,
    BigInt(fight.payout) !== expected && `payout ${fight.payout} ≠ expected ${expected}`,
  ].filter(Boolean);
  if (problems.length)
    throw new Error(`round ${round} (${fight.sessionId}): ${problems.join('; ')}`);
  console.info(
    `  ✓ round ${round} ${fight.sessionId}: ${CLASS_NAMES[fight.settledClass]} · payout ${fight.payout} · hash ${fight.liveHash}`,
  );
  await frame.getByRole('button', { name: 'Back again' }).click();
  return fight;
}

const browser = await launchBrowser();
try {
  const page = await newPage(browser);
  const frame = await openChickenz(page);
  const seen = new Set<number>();
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const fight = await playRound(frame, round);
    seen.add(fight.settledClass);
    if (seen.has(TOP_CLASS) && seen.size === CLASS_NAMES.length) break;
  }
  if (!seen.has(TOP_CLASS)) throw new Error(`no flawless (6×) round in ${MAX_ROUNDS} tries`);
  console.info(
    `back-a-bird e2e: PASS (classes seen: ${[...seen].map((c) => CLASS_NAMES[c]).join(', ')})`,
  );
} catch (error) {
  console.error('back-a-bird e2e: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
