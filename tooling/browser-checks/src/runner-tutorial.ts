// S26 acceptance: the six Neon Dash lessons, played through the real keyboard path. An in-page
// "player" reads the distance to the next barrier each frame and presses what the lesson teaches
// (lane change, jump, slide, slide, jump-then-slam, lane change to the orb). Every lesson must be
// judged passed by the live sim, ending on the "You're ready" card. Needs the web dev server.
import { launchBrowser } from './browser.ts';

const WEB_URL = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => localStorage.removeItem('ruckus.runner.controlsSeen'));
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error(`  page error: ${e.message}`));

try {
  await page.goto(`${WEB_URL}/?game=runner`);
  await page.waitForFunction('globalThis.__ruckusRunner && globalThis.__ruckusMachine', undefined, {
    timeout: 20_000,
  });
  await page.evaluate("globalThis.__ruckusMachine.getState().send('entering')");
  await page.getByRole('button', { name: 'Quick lesson' }).click({ timeout: 20_000 });
  await page.waitForFunction('globalThis.__ruckusRunner.mode.kind === "tutorial"');
  console.info('  ✓ first visit: How to play → Quick lesson');

  // The player: presses by distance (m) to the next barrier, like a person reading the road.
  await page.evaluate(`(() => {
    const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
    const tap = (code) => { key(code, true); setTimeout(() => key(code, false), 80); };
    let lesson = -1, step = 0, holding = null;
    const hold = (code) => { if (holding !== code) { if (holding) key(holding, false); key(code, true); holding = code; } };
    const release = () => { if (holding) key(holding, false); holding = null; };
    const frame = () => {
      const t = globalThis.__ruckusRunnerTutorial.getState();
      const d = globalThis.__ruckusRunner;
      const r = d.world.runners[0];
      if (t.lesson !== lesson || (t.note && !t.passed && step > 0 && r.s < 5)) { lesson = t.lesson; step = 0; release(); }
      const next = d.world.course.find((e) => e.kind === 'barrier' && e.s > r.s - 1.5);
      const dist = next ? next.s - r.s : Infinity;
      if (!t.passed && !t.finished) {
        if (lesson === 0 && step === 0) { tap('KeyA'); step = 1; }
        if (lesson === 1 && step === 0 && dist < 6.2) { tap('KeyW'); step = 1; }
        if ((lesson === 2 || lesson === 3) && dist < 4.5) hold('KeyS');
        if ((lesson === 2 || lesson === 3) && !next) release();
        if (lesson === 4) {
          if (step === 0 && dist < 6.2) { tap('KeyW'); step = 1; }
          else if (step === 1 && next && next.barrier === 'duckFull' && dist < 5) { hold('KeyS'); step = 2; }
          else if (step === 2 && !next) release();
        }
        if (lesson === 5 && step === 0) { tap('KeyD'); step = 1; }
      }
      if (!t.finished) requestAnimationFrame(frame);
      else release();
    };
    requestAnimationFrame(frame);
  })()`);

  let seen = -1;
  for (;;) {
    const t = (await page.evaluate(
      'JSON.stringify((({ lesson, passed, finished, note }) => ({ lesson, passed, finished, note }))(globalThis.__ruckusRunnerTutorial.getState()))',
    )) as string;
    const state = JSON.parse(t) as {
      lesson: number;
      passed: boolean;
      finished: boolean;
      note: string | null;
    };
    if (state.passed && state.lesson !== seen) {
      seen = state.lesson;
      console.info(`  ✓ lesson ${state.lesson + 1} passed: ${state.note ?? ''}`);
    }
    if (state.finished) break;
    await page.waitForTimeout(150);
  }
  await page.getByText("YOU'RE READY").waitFor({ timeout: 10_000 });
  console.info('runner tutorial: PASS');
} catch (error) {
  console.error('runner tutorial: FAIL', error);
  await page.screenshot({ path: '/tmp/runner-tutorial-fail.png' }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
