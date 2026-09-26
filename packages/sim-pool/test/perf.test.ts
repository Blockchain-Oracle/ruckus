import { expect, it } from 'vitest';

import { PoolSim, rack } from '../src/index.ts';

/** Per-break wall time the bot's shot search can afford on a dev machine. */
const BREAK_BUDGET_MS = 100;

// Wall-clock budgets swing 2-3× between runs on shared CI runners (116 ms, then 282 ms), so this
// is a local check; CI still covers the sim's correctness everywhere else.
it.skipIf(Boolean(process.env.CI))('simulates breaks fast enough for a searching bot', () => {
  const t0 = performance.now();
  let steps = 0;
  for (let seed = 0; seed < 20; seed++) {
    const sim = new PoolSim(rack(seed));
    sim.shoot({ dx: 1, dy: 0, power: 0.9, spinX: 0, spinY: 0 });
    steps += sim.runToRest();
  }
  const ms = performance.now() - t0;
  console.info(`20 breaks: ${steps} steps in ${ms.toFixed(0)} ms`);
  expect(ms / 20).toBeLessThan(BREAK_BUDGET_MS);
});
