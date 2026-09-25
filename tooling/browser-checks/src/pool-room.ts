// Two real browsers in a Pool room: the host creates it in the UI, adds a labelled bot and starts;
// a friend opens the invite link mid-rack and watches. The host plays turns (shots chosen by the
// bot search, sent through the real HUD path). At every rest both tables must be bit-identical.
// Needs the web dev server (:5173) and a local game server (:2567).
import type { Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const TURNS = Number(process.env.TURNS ?? 12);

type Kit = {
  aim: Record<string, number | string>;
  usePool: { getState(): Record<string, unknown> };
  thinkBot: (...a: unknown[]) => Promise<Record<string, unknown>>;
};

const browser = await launchBrowser();
const open = async (url: string, name: string) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript((n) => {
    localStorage.setItem(
      'ruckus.profile',
      JSON.stringify({ state: { name: n, named: true }, version: 1 }),
    );
  }, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`  [${name}] page error: ${e.message}`));
  await page.goto(url);
  return page;
};
const tableHash = (p: Page) =>
  p.evaluate(() => {
    const d = (
      globalThis as unknown as { __ruckusPool: { driver: { balls: Float64Array; phase: string } } }
    ).__ruckusPool;
    const bytes = new Uint8Array(d.driver.balls.buffer);
    let h = 2166136261;
    for (const b of bytes) h = Math.imul(h ^ b, 16777619) >>> 0;
    return { hash: h.toString(16), phase: d.driver.phase };
  });

try {
  const host = await open(`${WEB_URL}/?game=pool&preview`, 'HOST');
  await host.getByRole('button', { name: 'Online' }).click({ timeout: 20_000 });
  await host.getByRole('button', { name: 'Create room' }).click();
  const codeEl = host.locator('.select-all');
  await codeEl.waitFor({ timeout: 15_000 });
  const code = (await codeEl.innerText()).trim();
  console.info(`room ${code}`);
  await host.getByRole('button', { name: 'Add bot' }).click();
  await host.getByRole('button', { name: 'Start' }).click();
  await host.waitForFunction(
    () =>
      (globalThis as unknown as { __ruckusPool?: { mode: string } }).__ruckusPool?.mode ===
      'online',
    undefined,
    { timeout: 15_000 },
  );
  console.info('  ✓ host is at the table');

  const friend = await open(`${WEB_URL}/?game=pool&preview&room=${code}`, 'FRIEND');
  await friend.waitForFunction(
    () =>
      (globalThis as unknown as { __ruckusPool?: { mode: string; mySlot: number } }).__ruckusPool
        ?.mode === 'online',
    undefined,
    { timeout: 20_000 },
  );
  const slot = await friend.evaluate(
    () => (globalThis as unknown as { __ruckusPool: { mySlot: number } }).__ruckusPool.mySlot,
  );
  console.info(`  ✓ friend joined mid-rack as ${slot < 0 ? 'watcher' : `seat ${slot}`}`);

  let checks = 0;
  for (let turn = 0; turn < TURNS; turn++) {
    // Wait until the table is at rest and it's the host's turn (or the rack is over).
    const state = await host.waitForFunction(
      () => {
        const g = globalThis as unknown as {
          __ruckusPool: { driver: { phase: string }; humanTurn(): boolean };
        };
        const d = g.__ruckusPool;
        return d.driver.phase === 'over'
          ? 'over'
          : d.driver.phase === 'aim' && d.humanTurn()
            ? 'mine'
            : false;
      },
      undefined,
      { timeout: 90_000, polling: 250 },
    );
    const what = await state.jsonValue();
    // Both tables at rest: compare.
    await friend.waitForFunction(
      () =>
        (globalThis as unknown as { __ruckusPool: { driver: { phase: string } } }).__ruckusPool
          .driver.phase !== 'rolling',
      undefined,
      { timeout: 30_000 },
    );
    const [a, b] = [await tableHash(host), await tableHash(friend)];
    if (a.hash !== b.hash) {
      const dump = (p: Page) =>
        p.evaluate(() => {
          const d = (
            globalThis as unknown as {
              __ruckusPool: {
                driver: { balls: Float64Array; phase: string; rack: unknown };
                stroke: unknown;
              };
            }
          ).__ruckusPool;
          return {
            balls: Array.from(d.driver.balls),
            phase: d.driver.phase,
            rack: d.driver.rack,
            stroke: Boolean(d.stroke),
          };
        });
      const [x, y] = [await dump(host), await dump(friend)];
      const diffs = x.balls
        .map((v, i) => (v !== y.balls[i] ? `${i}:${v}/${y.balls[i]}` : ''))
        .filter(Boolean);
      console.error('host', x.phase, x.stroke, JSON.stringify(x.rack));
      console.error('friend', y.phase, y.stroke, JSON.stringify(y.rack));
      console.error('diffs', diffs.slice(0, 10).join(' '));
      const racks = (p: Page) =>
        p.evaluate(() => (globalThis as { __poolRacks?: string[] }).__poolRacks);
      console.error('host racks', await racks(host), 'friend racks', await racks(friend));
      const played = (p: Page) =>
        p.evaluate(() => (globalThis as { __poolPlayed?: number }).__poolPlayed);
      console.error('played host', await played(host), 'friend', await played(friend));
      const info = (p: Page) =>
        p.evaluate(() => {
          const d = (
            globalThis as unknown as {
              __ruckusPool: {
                mode: string;
                mySlot: number;
                driver: { seed: number; remote: boolean; balls: Float64Array };
              };
            }
          ).__ruckusPool;
          return `${d.mode} slot${d.mySlot} seed${d.driver.seed} remote${d.driver.remote} cue=${d.driver.balls[0]},${d.driver.balls[1]}`;
        });
      console.error('host', await info(host), '| friend', await info(friend));
      throw new Error(`tables differ after turn ${turn}: host ${a.hash} friend ${b.hash}`);
    }
    checks += 1;
    if (what === 'over') break;
    await host.evaluate(async (t) => {
      const g = globalThis as unknown as {
        __ruckusPool: {
          driver: { balls: Float64Array; rack: unknown; placeCue(x: number, y: number): void };
          shootHuman(): void;
        };
        __ruckusPoolKit: Kit;
      };
      const d = g.__ruckusPool;
      const { aim, usePool, thinkBot } = g.__ruckusPoolKit;
      const dec = (await thinkBot(d.driver.balls, d.driver.rack, 95, 77 + t)) as {
        place: { x: number; y: number } | null;
        calledPocket: number;
        shot: Record<string, number>;
      };
      if (dec.place) d.driver.placeCue(dec.place.x, dec.place.y);
      const st = usePool.getState() as { mustCall: boolean; set(p: object): void };
      if (st.mustCall) st.set({ calledPocket: dec.calledPocket < 0 ? 3 : dec.calledPocket });
      Object.assign(aim, dec.shot);
      d.shootHuman();
    }, turn);
  }
  console.info(`  ✓ ${checks} rests compared: host and friend tables bit-identical`);
  console.info('pool room: PASS');
} catch (error) {
  for (const p of browser.contexts().flatMap((c) => c.pages())) {
    const state = await p
      .evaluate(() => {
        const d = (
          globalThis as unknown as {
            __ruckusPool: {
              mode: string;
              mySlot: number;
              stroke: unknown;
              playedQueue: unknown[];
              humanTurn(): boolean;
              driver: {
                phase: string;
                rack: unknown;
                sim: { active: boolean; stepIndex: number };
                snap: unknown;
                remote: boolean;
              };
            };
          }
        ).__ruckusPool;
        return JSON.stringify({
          mode: d.mode,
          slot: d.mySlot,
          phase: d.driver.phase,
          mine: d.humanTurn(),
          rack: d.driver.rack,
          stroke: Boolean(d.stroke),
          queue: d.playedQueue.length,
          active: d.driver.sim.active,
          steps: d.driver.sim.stepIndex,
          snap: Boolean(d.driver.snap),
          played: (globalThis as { __poolPlayed?: number }).__poolPlayed,
        });
      })
      .catch((e: Error) => e.message);
    console.error('  state:', state);
    const log = await p
      .evaluate(() =>
        (globalThis as unknown as { __ruckusPool: { log: string[] } }).__ruckusPool.log
          .slice(-25)
          .join('\n'),
      )
      .catch(() => '');
    console.error(log);
  }
  console.error('pool room: FAIL', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
