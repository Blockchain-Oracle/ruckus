// S15 acceptance: Call Your Shot end to end inside the Chain simulator host, through the real UI.
// Each round: find a call on a practice table, bet it (bet → WAITING_RANDOMNESS → SETTLED), then
// check the stroke that plays made or missed exactly as the contract settled, and the payout is
// stake × the tier's multiplier. Rounds repeat until the top multiplier (a long-shot make) lands.
import type { Frame } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const SIMULATOR_URL = process.env.SIMULATOR_URL ?? 'http://localhost:3300';
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS ?? 60);
const TIER_BPS = { straight: 12_800n, cut: 19_200n, thin: 38_400n, long: 96_000n } as const;
type Tier = keyof typeof TIER_BPS;

async function openPool(): Promise<Frame> {
  const deployment = (await (await fetch(`${SIMULATOR_URL}/__local-contracts.json`)).json()) as {
    games: { name: string; address: string }[];
  };
  const game = deployment.games.find((g) => g.name === 'RuckusGame');
  if (!game) throw new Error('RuckusGame not deployed in the simulator');
  const page = await (await launchBrowser()).newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));
  const gameUrl = `${WEB_URL}/?game=pool&preview`;
  await page.goto(
    `${SIMULATOR_URL}/?game=${encodeURIComponent(gameUrl)}&gameAddress=${game.address}`,
  );
  const handle = await page.waitForSelector(`iframe[src^="${WEB_URL}"]`, { timeout: 20_000 });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error('game iframe did not load');
  await frame.getByRole('button', { name: 'Call Your Shot' }).click({ timeout: 30_000 });
  await frame.waitForFunction(
    () =>
      (globalThis as unknown as { __ruckusPool?: { mode: string } }).__ruckusPool?.mode === 'wager',
    undefined,
    { timeout: 15_000 },
  );
  return frame;
}

/** Sweep the aim on fresh tables until the call is the wanted tier (any tier when null). */
async function findCall(frame: Frame, want: Tier | null, round: number) {
  return frame.evaluate(
    async ([wanted, r]) => {
      const g = globalThis as unknown as {
        __ruckusPool: { startWager(seed: number): void };
        __ruckusPoolKit: {
          aim: { dx: number; dy: number; power: number };
          useShotBet: {
            getState(): { call: { tier: string; ball: number; pocket: number } | null };
          };
        };
      };
      const { aim, useShotBet } = g.__ruckusPoolKit;
      for (let table = 0; table < 40; table++) {
        g.__ruckusPool.startWager((r * 1000 + table + 1) >>> 0);
        await new Promise((res) => setTimeout(res, 50));
        for (let a = 0; a < 1440; a++) {
          const t = (a * Math.PI) / 720;
          aim.dx = Math.cos(t);
          aim.dy = Math.sin(t);
          await new Promise((res) => requestAnimationFrame(() => res(null)));
          const call = useShotBet.getState().call;
          if (call && (!wanted || call.tier === wanted)) {
            aim.power = 0.42;
            return call;
          }
        }
      }
      return null;
    },
    [want, round] as const,
  );
}

const frame = await openPool();
let longMade = false;
const tiersSeen = new Set<string>();
try {
  for (let round = 1; round <= MAX_ROUNDS && !longMade; round++) {
    const want: Tier | null =
      round <= 3 ? ((['straight', 'cut', 'thin'] as const)[round - 1] ?? null) : 'long';
    const call = await findCall(frame, want, round);
    if (!call) throw new Error(`no ${want ?? ''} call found`);
    await frame.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('button')).some(
          (b) => /^Call it/.test(b.textContent ?? '') && !b.disabled,
        ),
      undefined,
      { timeout: 20_000 },
    );
    await frame.getByRole('button', { name: /^Call it/ }).click();
    // A call the search can't make is refused (toast) and stays in setup: try another table.
    const state = await frame.waitForFunction(
      () => {
        const p = (
          globalThis as unknown as {
            __ruckusPoolKit: { useShotBet: { getState(): { phase: string } } };
          }
        ).__ruckusPoolKit.useShotBet.getState().phase;
        return p === 'result' ? 'result' : p === 'setup' ? 'refused' : false;
      },
      undefined,
      { timeout: 90_000, polling: 200 },
    );
    if ((await state.jsonValue()) === 'refused') {
      console.info(`  · round ${round}: ${call.tier} call not makeable, new table`);
      continue;
    }
    const r = await frame.evaluate(() => {
      const g = globalThis as unknown as {
        __ruckusPool: { driver: { sim: { events: unknown[] } } };
        __ruckusPoolKit: {
          useShotBet: {
            getState(): {
              result: {
                made: boolean;
                wager: bigint;
                payout: bigint;
                sessionId: string;
                call: { ball: number; pocket: number; tier: string };
              };
            };
          };
          made(e: unknown[], b: number, p: number): boolean;
        };
      };
      const { result } = g.__ruckusPoolKit.useShotBet.getState();
      return {
        made: result.made,
        played: g.__ruckusPoolKit.made(
          g.__ruckusPool.driver.sim.events,
          result.call.ball,
          result.call.pocket,
        ),
        wager: result.wager.toString(),
        payout: result.payout.toString(),
        tier: result.call.tier,
        sessionId: result.sessionId,
      };
    });
    const expected = r.made ? (BigInt(r.wager) * TIER_BPS[r.tier as Tier]) / 10_000n : 0n;
    const problems = [
      r.played !== r.made &&
        `the stroke ${r.played ? 'made' : 'missed'} but the chain settled ${r.made ? 'make' : 'miss'}`,
      BigInt(r.payout) !== expected && `payout ${r.payout} ≠ ${expected}`,
    ].filter(Boolean);
    if (problems.length) throw new Error(`round ${round} (${r.sessionId}): ${problems.join('; ')}`);
    tiersSeen.add(`${r.tier}:${r.made ? 'make' : 'miss'}`);
    console.info(
      `  ✓ round ${round} ${r.sessionId}: ${r.tier} ${r.made ? 'MADE' : 'missed'} · payout ${r.payout}`,
    );
    if (r.tier === 'long' && r.made) longMade = true;
    await frame.getByRole('button', { name: 'New table' }).click();
  }
  if (!longMade) throw new Error(`no long-shot make (9.6×) in ${MAX_ROUNDS} rounds`);
  console.info(`call-your-shot e2e: PASS (${[...tiersSeen].join(', ')})`);
} catch (error) {
  console.error('call-your-shot e2e: FAIL', error);
  process.exitCode = 1;
}
process.exit();
