// Phone audit: every hub state and overlay of every game, on five phones, tiled into one contact
// sheet per state so a layout that overflows one screen is obvious next to the others.
// Usage: tsx src/mobile-audit.ts <outDir> [game ...]   (web dev server on :5173)
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type BrowserContext, devices, type Page } from 'playwright-core';

import { launchBrowser } from './browser.ts';

const [out = '/tmp/mobile-audit', ...only] = process.argv.slice(2);
const BASE = process.env.AUDIT_URL ?? 'http://localhost:5173/';
const SETTLE_MS = 4500;
const OPEN_MS = 900;

/** iPhones get the WebKit truth: no page Fullscreen API. (A string: tsx mangles functions.) */
const NO_FULLSCREEN = `Object.defineProperty(document, 'fullscreenEnabled', { get: () => false, configurable: true });`;

const PHONES = [
  { id: 'android-360', device: devices['Galaxy S8'], ios: false },
  { id: 'iphone-390', device: devices['iPhone 13'], ios: true },
  { id: 'iphone-se-320', device: devices['iPhone SE'], ios: true },
  { id: 'iphone-land', device: devices['iPhone 13 landscape'], ios: true },
  { id: 'android-land', device: devices['Galaxy S8 landscape'], ios: false },
] as const;

// ADR-010: every game's gold button is "Bet", subtitled with its round.
const GAMES = [
  { id: 'chickenz', wager: /^Bet/i },
  { id: 'pool', wager: /^Bet/i },
  { id: 'soccer', wager: /^Bet/i },
  { id: 'runner', wager: /^Bet/i },
] as const;

type Step = { name: string; run(page: Page, ios: boolean): Promise<boolean> };

// The last match: a hidden hub button of the same name (e.g. Fullscreen) precedes the HUD's.
const tap = async (page: Page, name: RegExp) => {
  const button = page.getByRole('button', { name }).last();
  if (!(await button.isVisible().catch(() => false))) return false;
  await button.click();
  await page.waitForTimeout(OPEN_MS);
  return true;
};

const steps = (wager: RegExp): Step[] => [
  { name: 'hub', run: async () => true },
  { name: 'switcher', run: (p) => tap(p, /Switch game/) },
  { name: 'settings', run: (p) => tap(p, /^Settings$/) },
  { name: 'online', run: (p) => tap(p, /Play with friends/) },
  { name: 'wager', run: (p) => tap(p, wager) },
  {
    name: 'play',
    run: async (p) => {
      if (!(await tap(p, /^Play$/))) return false;
      await p.waitForTimeout(SETTLE_MS);
      return true;
    },
  },
  {
    name: 'play-fullscreen',
    run: async (p, ios) => {
      if (!(await tap(p, /^Play$/))) return false;
      await p.waitForTimeout(SETTLE_MS);
      // Any first-run card (lesson offer, how-to, rotate hint) covers the HUD: take the match.
      // The pre-match card (Play / Kick off / Start) and the rotate hint cover the HUD: go in.
      await tap(p, /^(play anyway)$/i);
      await tap(p, /^(play|kick off|start)$/i);
      await p.waitForTimeout(SETTLE_MS);
      const ok = await tap(p, ios ? /Play full screen/ : /^Fullscreen$/);
      if (ok && !ios)
        console.log(
          `  fullscreen engaged: ${await p.evaluate('document.fullscreenElement !== null')}`,
        );
      return ok;
    },
  },
];

async function shoot(ctx: BrowserContext, game: (typeof GAMES)[number], dir: string, ios: boolean) {
  const shots: string[] = [];
  for (const step of steps(game.wager)) {
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const loaded = await page
      .goto(`${BASE}?game=${game.id}`, { timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(SETTLE_MS);
    const ok = loaded && (await step.run(page, ios).catch(() => false));
    const file = join(dir, `${game.id}-${step.name}.png`);
    if (ok) {
      await page.screenshot({ path: file });
      shots.push(step.name);
    }
    for (const e of errors) console.log(`  pageerror ${game.id}/${step.name}: ${e}`);
    await page.close();
  }
  return shots;
}

mkdirSync(out, { recursive: true });
const browser = await launchBrowser();
const games = GAMES.filter((g) => only.length === 0 || only.includes(g.id));
// AUDIT_PHONES=iphone-se-320,iphone-land narrows the run (two processes can split the phones).
const phoneFilter = process.env.AUDIT_PHONES?.split(',');
const phones = PHONES.filter((p) => !phoneFilter || phoneFilter.includes(p.id));
for (const phone of phones) {
  const ctx = await browser.newContext({ ...phone.device, deviceScaleFactor: 1 });
  if (phone.ios) await ctx.addInitScript({ content: NO_FULLSCREEN });
  const dir = join(out, phone.id);
  mkdirSync(dir, { recursive: true });
  for (const game of games) {
    const shots = await shoot(ctx, game, dir, phone.ios);
    console.log(`${phone.id} ${game.id}: ${shots.join(', ')}`);
  }
  await ctx.close();
}

// One sheet per game+state: portraits in a row, landscapes under them, each labelled.
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const game of games)
  for (const step of steps(game.wager)) {
    const tiles = PHONES.map((phone) => {
      const file = join(out, phone.id, `${game.id}-${step.name}.png`);
      let src = '';
      try {
        src = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
      } catch {
        return `<figure><figcaption>${phone.id}: not shown</figcaption></figure>`;
      }
      return `<figure><figcaption>${phone.id}</figcaption><img src="${src}"></figure>`;
    });
    await sheet.setContent(
      `<body style="margin:0;padding:12px;background:#333;font:14px sans-serif;color:#fff">
        <h2 style="margin:0 0 8px">${game.id} / ${step.name}</h2>
        <div style="display:flex;gap:12px;align-items:flex-start">${tiles.slice(0, 3).join('')}</div>
        <div style="display:flex;gap:12px;margin-top:12px">${tiles.slice(3).join('')}</div>
        <style>figure{margin:0}img{display:block;outline:1px solid #888}</style></body>`,
    );
    await sheet.screenshot({
      path: join(out, `sheet-${game.id}-${step.name}.png`),
      fullPage: true,
    });
  }
await browser.close();
console.log(`contact sheets in ${out}`);
