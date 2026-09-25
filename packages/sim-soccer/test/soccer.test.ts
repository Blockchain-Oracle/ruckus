import { describe, expect, it } from 'vitest';

import {
  BALL_RADIUS,
  CEILING,
  GOAL_HEIGHT,
  GOAL_LINE_X,
  hashWorld,
  JUMP_SPEED,
  newWorld,
  PLAYER_RADIUS,
  packWorld,
  step,
  TICK_HZ,
  tick,
  unpackWorld,
} from '../src/index.ts';

const play = (w: ReturnType<typeof newWorld>) => {
  while (w.phase === 'kickoff') step(w);
};

describe('head soccer', () => {
  it('is deterministic with bots', () => {
    const run = () => {
      const w = newWorld(77, 1, [70, 80]);
      for (let i = 0; i < 90 * TICK_HZ; i++) tick(w);
      return hashWorld(w);
    };
    expect(run()).toBe(run());
  });

  it('jumps higher when jump is held', () => {
    const peak = (hold: boolean) => {
      const w = newWorld(1, 1, [-1, -1]);
      play(w);
      const p = w.players[0];
      if (!p) throw new Error('no player');
      p.input = { h: 0, jump: true };
      let top = 0;
      for (let i = 0; i < 90; i++) {
        step(w);
        if (!hold && i > 2) p.input = { h: 0, jump: false };
        top = Math.max(top, p.y);
      }
      return top;
    };
    const held = peak(true);
    const tapped = peak(false);
    expect(held).toBeGreaterThan(tapped + 40);
    // About v²/2g with the held gravity above the resting height (discrete steps land a little short).
    const ideal = PLAYER_RADIUS + (JUMP_SPEED * JUMP_SPEED) / 2400;
    expect(held).toBeGreaterThan(ideal - 12);
    expect(held).toBeLessThanOrEqual(ideal);
  });

  it('a ball driven into the goal under the bar scores for the attacker', () => {
    const w = newWorld(1, 1, [-1, -1]);
    play(w);
    w.ball = { x: GOAL_LINE_X - 60, y: BALL_RADIUS + 20, vx: 600, vy: 0 };
    for (let i = 0; i < 30 && w.phase === 'play'; i++) step(w);
    expect(w.score).toEqual([1, 0]);
    expect(w.phase).toBe('goal');
  });

  it('a ball over the bar bounces off it instead of scoring', () => {
    const w = newWorld(1, 1, [-1, -1]);
    play(w);
    w.ball = { x: GOAL_LINE_X - 120, y: GOAL_HEIGHT + 60, vx: 500, vy: -200 };
    for (let i = 0; i < 40; i++) step(w);
    expect(w.score).toEqual([0, 0]);
  });

  it('keeps the ball inside the arena', () => {
    const w = newWorld(5, 2, [60, 70, 80, 90]);
    for (let i = 0; i < 60 * TICK_HZ; i++) {
      tick(w);
      expect(w.ball.y).toBeLessThanOrEqual(CEILING);
      expect(w.ball.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('bots score goals in a full match', () => {
    let goals = 0;
    for (const seed of [1, 2, 3]) {
      const w = newWorld(seed, 1, [85, 60]);
      for (let i = 0; i < 90 * TICK_HZ && w.phase !== 'over'; i++) tick(w);
      goals += w.score[0] + w.score[1];
    }
    expect(goals).toBeGreaterThan(2);
  });
});

describe('snapshots', () => {
  it('pack → unpack continues bit-identically (the room netcode relies on it)', () => {
    const a = newWorld(9, 2, [60, 70, 80, 90]);
    for (let i = 0; i < 1000; i++) tick(a);
    const b = newWorld(1, 2, [0, 0, 0, 0]);
    expect(unpackWorld(b, packWorld(a))).toBe(true);
    expect(hashWorld(b)).toBe(hashWorld(a));
    for (let i = 0; i < 2000; i++) {
      tick(a);
      tick(b);
    }
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(b.score).toEqual(a.score);
  });

  it('refuses a snapshot for a different format', () => {
    expect(unpackWorld(newWorld(1, 1, [0, 0]), packWorld(newWorld(1, 2, [0, 0, 0, 0])))).toBe(
      false,
    );
  });
});
