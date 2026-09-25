import { describe, expect, it } from 'vitest';

import {
  applyOutcome,
  F,
  judgeShot,
  newBalls,
  newRack,
  type RackState,
  type ShotEvent,
  set,
} from '../src/index.ts';

/** A table with just the listed balls on it (others already potted). */
const table = (live: number[]) => {
  const b = newBalls();
  for (let i = 0; i < 16; i++) if (!live.includes(i)) set(b, i, F.pocket, 0);
  return b;
};
const pot = (b: Float64Array, ball: number, pocket = 3) => set(b, ball, F.pocket, pocket);
const hit = (a: number, b: number): ShotEvent => ({ kind: 'ball', step: 1, a, b, speed: 1 });
const rail = (a: number): ShotEvent => ({ kind: 'cushion', step: 2, a, speed: 1 });
const drop = (a: number, pocket = 3): ShotEvent => ({
  kind: 'pocket',
  step: 3,
  a,
  pocket,
  speed: 1,
});
const playing = (groups: RackState['groups'] = [null, null]): RackState => ({
  ...newRack(0),
  isBreak: false,
  ballInHand: 'none',
  groups,
});

describe('8-ball rules', () => {
  it('scratch is a foul with ball in hand for the opponent', () => {
    const s = playing();
    const before = table([0, 1, 9, 8]);
    const after = table([1, 9, 8]);
    const out = judgeShot(s, before, after, [hit(0, 1), drop(0)], -1);
    expect(out.foul).toBe('scratch');
    applyOutcome(s, after, out);
    expect(s.shooter).toBe(1);
    expect(s.ballInHand).toBe('anywhere');
  });

  it('first clean pot assigns groups and keeps the table', () => {
    const s = playing();
    const before = table([0, 3, 9, 8]);
    const after = table([0, 9, 8]);
    const out = judgeShot(s, before, after, [hit(0, 3), drop(3)], -1);
    expect(out.foul).toBeNull();
    expect(out.assigned).toBe(true);
    expect(s.groups).toEqual(['solids', 'stripes']);
    expect(out.continues).toBe(true);
  });

  it('hitting the other group first is a foul', () => {
    const s = playing(['solids', 'stripes']);
    const b = table([0, 3, 9, 8]);
    expect(judgeShot(s, b, b, [hit(0, 9), rail(9)], -1).foul).toBe('wrong-ball');
  });

  it('no rail after contact and no pot is a foul', () => {
    const s = playing(['solids', 'stripes']);
    const b = table([0, 3, 9, 8]);
    expect(judgeShot(s, b, b, [hit(0, 3)], -1).foul).toBe('no-rail');
  });

  it('the 8 in the called pocket after clearing wins', () => {
    const s = playing(['solids', 'stripes']);
    const before = table([0, 9, 8]);
    const after = table([0, 9]);
    const out = judgeShot(s, before, after, [hit(0, 8), drop(8, 4)], 4);
    expect(out.winner).toBe(0);
  });

  it('the 8 in the wrong pocket, or early, loses', () => {
    const s = playing(['solids', 'stripes']);
    const wrong = judgeShot(s, table([0, 9, 8]), table([0, 9]), [hit(0, 8), drop(8, 2)], 4);
    expect(wrong.winner).toBe(1);
    const early = judgeShot(s, table([0, 3, 9, 8]), table([0, 3, 9]), [hit(0, 3), drop(8, 2)], 2);
    expect(early.winner).toBe(1);
  });

  it('the 8 on the break is spotted back and play goes on', () => {
    const s = newRack(0);
    const after = table([0, 1, 9]);
    pot(after, 8);
    const out = judgeShot(s, table([0, 1, 9, 8]), after, [hit(0, 1), drop(8)], -1);
    expect(out.winner).toBe(-1);
    expect(after[8 * 8 + F.pocket]).toBe(-1);
  });
});
