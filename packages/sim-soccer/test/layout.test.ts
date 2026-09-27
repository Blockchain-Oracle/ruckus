import { describe, expect, it } from 'vitest';

import { hashWorld, layoutTeams, newWorld, TICK_HZ, tick, validLayout } from '../src/index.ts';

const run = (w: ReturnType<typeof newWorld>, seconds: number) => {
  for (let i = 0; i < seconds * TICK_HZ; i++) tick(w);
  return hashWorld(w);
};

describe('team line-ups (S35)', () => {
  it('explicit alternating teams are the old 2v2, byte for byte', () => {
    const bots = [70, 70, 70, 70];
    expect(run(newWorld(9, [0, 1, 0, 1], bots), 30)).toBe(run(newWorld(9, 2, bots), 30));
  });

  it('plays a 2v1: the lone side stands where a 1v1 player would', () => {
    const w = newWorld(4, [0, 0, 1], [60, 60, 60]);
    expect(w.players.map((p) => p.team)).toEqual([0, 0, 1]);
    const lone = w.players[2];
    const oneVsOne = newWorld(4, 1, [60, 60]).players[1];
    expect(lone?.x).toBe(oneVsOne?.x);
    // The pair spreads out on its own half.
    const [a, b] = w.players;
    expect(a && b && a.x < 0 && b.x < 0 && a.x !== b.x).toBe(true);
    const h = run(w, 60);
    expect(run(newWorld(4, [0, 0, 1], [60, 60, 60]), 60)).toBe(h);
  });

  it('knows a playable line-up', () => {
    expect(layoutTeams(1)).toEqual([0, 1]);
    expect(validLayout([0, 1, 0])).toBe(true);
    expect(validLayout([1, 1, 0, 0])).toBe(true);
    expect(validLayout([0, 0])).toBe(false);
    expect(validLayout([0, 0, 0, 1])).toBe(false);
  });
});
