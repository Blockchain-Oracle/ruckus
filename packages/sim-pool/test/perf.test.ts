import { expect, it } from 'vitest';

import { PoolSim, rack } from '../src/index.ts';

it('simulates breaks fast enough for a searching bot', () => {
  const t0 = performance.now();
  let steps = 0;
  for (let seed = 0; seed < 20; seed++) {
    const sim = new PoolSim(rack(seed));
    sim.shoot({ dx: 1, dy: 0, power: 0.9, spinX: 0, spinY: 0 });
    steps += sim.runToRest();
  }
  const ms = performance.now() - t0;
  console.info(`20 breaks: ${steps} steps in ${ms.toFixed(0)} ms`);
  expect(ms / 20).toBeLessThan(100);
});
