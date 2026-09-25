// S20 acceptance: Call the Finish end to end inside the Chain simulator host, through the real UI.
// Each round picks a call in the sheet and bets it (bet → WAITING_RANDOMNESS → SETTLED). Checks:
// - the golden goal that plays ends exactly the way the presentation promised;
// - a win shows a finish the call covers, and a loss never does;
// - the payout is stake × the call's multiplier, to the wei.
// Rounds repeat until the top multiplier (a team off the woodwork, 9.6×) lands.
import type { Frame } from 'playwright-core';

import { FINISH_CALLS, getBetTable } from '@arena/casino-math';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const SIMULATOR_URL = process.env.SIMULATOR_URL ?? 'http://localhost:3300';
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS ?? 60);
/** The first rounds sweep a spread of calls; then it chases the 9.6× call. */
const OPENERS = [
  ['Either', 'Any goal'],
  ['Tomato', 'Header'],
  ['Violet', 'Shot'],
  ['Either', 'No goal'],
  ['Either', 'Off the bar'],
] as const;
const TOP = ['Tomato', 'Off the bar'] as const;

type Evidence = {
  sessionId: string;
  outcomeClass: number;
  expectedFinish: number;
  playedFinish: number;
  betType: number;
  wager: string;
  payout: string;
};

async function openSoccer(): Promise<Frame> {
  const deployment = (await (await fetch(`${SIMULATOR_URL}/__local-contracts.json`)).json()) as {
    games: { name: string; address: string }[];
  };
  const game = deployment.games.find((g) => g.name === 'RuckusGame');
  if (!game) throw new Error('RuckusGame not deployed in the simulator');
  const page = await (await launchBrowser()).newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
  const gameUrl = `${WEB_URL}/?game=soccer`;
  await page.goto(
    `${SIMULATOR_URL}/?game=${encodeURIComponent(gameUrl)}&gameAddress=${game.address}`,
  );
  const handle = await page.waitForSelector(`iframe[src^="${WEB_URL}"]`, { timeout: 20_000 });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('game iframe did not load');
  await frame.getByRole('button', { name: 'Call the Finish' }).click({ timeout: 30_000 });
  return frame;
}

console.info('opening the simulator…');
const frame = await openSoccer();
console.info('  ✓ Call the Finish open in the simulator');
let topMade = false;
const seen = new Set<string>();
let last = '';
try {
  for (let round = 1; round <= MAX_ROUNDS && !topMade; round++) {
    const [team, finish] = OPENERS[round - 1] ?? TOP;
    if (finish !== 'No goal') await frame.getByRole('button', { name: team, exact: true }).click();
    await frame.getByRole('button', { name: finish, exact: true }).click();
    const callIt = frame.getByRole('button', { name: /^Call it/ });
    await callIt.click({ timeout: 30_000 });
    // Settled and presenting: skip ahead to the finish, then wait for the evidence and the card.
    await frame
      .getByRole('button', { name: 'Skip to the finish' })
      .click({ timeout: 90_000 })
      .catch(() => {});
    const handle = await frame.waitForFunction(
      (prev) => {
        const e = (globalThis as { __ruckusFinish?: { sessionId: string } }).__ruckusFinish;
        return e && e.sessionId !== prev ? JSON.stringify(e) : false;
      },
      last,
      { timeout: 90_000, polling: 200 },
    );
    const e = JSON.parse(String(await handle.jsonValue())) as Evidence;
    last = e.sessionId;
    const call = FINISH_CALLS.find((c) => c.betType === e.betType);
    if (!call) throw new Error(`unknown bet type ${e.betType}`);
    const made = e.outcomeClass === 0;
    const bps = getBetTable(call.betType).classes[0]?.multiplierBps ?? 0n;
    const expected = made ? (BigInt(e.wager) * bps) / 10_000n : 0n;
    const covered = (call.covers as readonly number[]).includes(e.playedFinish);
    const problems = [
      e.playedFinish !== e.expectedFinish &&
        `played finish ${e.playedFinish} ≠ promised ${e.expectedFinish}`,
      covered !== made && `a ${made ? 'win' : 'loss'} showed finish ${e.playedFinish}`,
      BigInt(e.payout) !== expected && `payout ${e.payout} ≠ ${expected}`,
    ].filter(Boolean);
    if (problems.length) throw new Error(`round ${round} (${e.sessionId}): ${problems.join('; ')}`);
    seen.add(`${call.name}:${made ? 'win' : 'loss'}`);
    console.info(
      `  ✓ round ${round} #${e.sessionId}: ${call.name} → ${made ? 'CALLED IT' : 'missed'} (finish ${e.playedFinish}) · payout ${e.payout}`,
    );
    if (call.name === 'Tomato · off the woodwork' && made) topMade = true;
    await frame.getByRole('button', { name: /Call again/ }).click({ timeout: 20_000 });
  }
  if (!topMade) throw new Error(`no 9.6× woodwork call landed in ${MAX_ROUNDS} rounds`);
  console.info(`call-the-finish e2e: PASS (${[...seen].join(', ')})`);
} catch (error) {
  console.error('call-the-finish e2e: FAIL', error);
  await frame
    .page()
    .screenshot({ path: process.env.SHOT ?? '/tmp/soccer-finish-fail.png' })
    .catch(() => {});
  process.exitCode = 1;
}
process.exit();
