import { describe, expect, it } from 'vitest';

import {
  CUE_BALL,
  F,
  findMake,
  findMiss,
  layout,
  made,
  newBalls,
  ON_TABLE,
  onTable,
  POCKET_MOUTHS,
  PoolSim,
  readCall,
  type Shot,
  set,
} from '../src/index.ts';

/** A straight-in: cue ball, 1 ball and the top-right corner mouth on one line. */
function straightIn() {
  const b = newBalls();
  for (let i = 0; i < 16; i++) set(b, i, F.pocket, 0);
  const m = POCKET_MOUTHS[3] as { x: number; y: number };
  const place = (ball: number, t: number) => {
    set(b, ball, F.pocket, ON_TABLE);
    set(b, ball, F.x, m.x - t * 0.8);
    set(b, ball, F.y, m.y - t * 0.4);
  };
  place(CUE_BALL, 1.0);
  place(1, 0.5);
  return b;
}

describe('call your shot', () => {
  it('lays out a legal practice table', () => {
    const b = layout(42);
    let n = 0;
    for (let i = 0; i < 16; i++) if (onTable(b, i)) n++;
    expect(n).toBe(7);
    expect(onTable(b, CUE_BALL)).toBe(true);
  });

  it('reads a straight-in as the straight tier on the right ball and pocket', () => {
    const b = straightIn();
    const call = readCall(b, 0.8, 0.4);
    expect(call).toMatchObject({ ball: 1, pocket: 3, tier: 'straight' });
  });

  it('finds a make near the stroke, and a miss that still reads as the same shot', () => {
    const b = straightIn();
    const call = readCall(b, 0.8, 0.4);
    if (!call) throw new Error('no call');
    const base: Shot = { dx: 0.8, dy: 0.4, power: 0.35, spinX: 0, spinY: 0 };
    const make = findMake(b, base, call, 1);
    expect(make).not.toBeNull();
    const run = (shot: Shot) => {
      const sim = new PoolSim(new Float64Array(b));
      sim.shoot(shot);
      sim.runToRest();
      return sim.events;
    };
    if (make) expect(made(run(make), call.ball, call.pocket)).toBe(true);
    const miss = findMiss(b, base, call, 7);
    expect(made(run(miss), call.ball, call.pocket)).toBe(false);
    // The miss is a tremor, not a different shot: within ~2° of the stroke.
    const cos =
      (miss.dx * 0.8 + miss.dy * 0.4) / (Math.hypot(miss.dx, miss.dy) * Math.hypot(0.8, 0.4));
    expect(cos).toBeGreaterThan(Math.cos((3 * Math.PI) / 180));
  });

  it('is deterministic', () => {
    const b = straightIn();
    const call = readCall(b, 0.8, 0.4);
    if (!call) throw new Error('no call');
    const base: Shot = { dx: 0.8, dy: 0.4, power: 0.35, spinX: 0.2, spinY: -0.1 };
    expect(findMiss(b, base, call, 99)).toEqual(findMiss(b, base, call, 99));
  });
});
