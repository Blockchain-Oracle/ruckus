import { expect, it } from 'vitest';

import {
  applyOutcome,
  botShot,
  CUE_BALL,
  F,
  judgeShot,
  newRack,
  PoolSim,
  rack,
  set,
} from '../src/index.ts';

/** Play one rack between two bots; returns the winner and the decision times. */
function playRack(seed: number, skills: [number, number]) {
  const balls = rack(seed);
  const state = newRack(0);
  const times: number[] = [];
  for (let turn = 0; turn < 120 && state.winner < 0; turn++) {
    const t0 = performance.now();
    const d = botShot(balls, state, skills[state.shooter], seed * 1000 + turn);
    times.push(performance.now() - t0);
    if (d.place) {
      set(balls, CUE_BALL, F.x, d.place.x);
      set(balls, CUE_BALL, F.y, d.place.y);
      set(balls, CUE_BALL, F.pocket, -1);
    }
    const before = new Float64Array(balls);
    const sim = new PoolSim(balls);
    sim.shoot(d.shot);
    sim.runToRest();
    const out = judgeShot(state, before, balls, sim.events, d.calledPocket);
    applyOutcome(state, balls, out);
  }
  return { winner: state.winner, times };
}

it('bots finish racks, and the stronger one wins more', { timeout: 120_000 }, () => {
  let strongWins = 0;
  const all: number[] = [];
  const racks = 6;
  for (let seed = 1; seed <= racks; seed++) {
    // Alternate seats so the break doesn't decide it.
    const strongFirst = seed % 2 === 0;
    const { winner, times } = playRack(seed, strongFirst ? [90, 20] : [20, 90]);
    expect(winner).toBeGreaterThanOrEqual(0);
    if ((winner === 0) === strongFirst) strongWins += 1;
    all.push(...times);
  }
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  console.info(
    `strong won ${strongWins}/${racks}; ${all.length} decisions, mean ${mean.toFixed(0)} ms, max ${Math.max(...all).toFixed(0)} ms`,
  );
  expect(strongWins).toBeGreaterThanOrEqual(racks / 2);
});
