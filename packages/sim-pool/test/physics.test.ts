import { describe, expect, it } from 'vitest';

import {
  at,
  BALL_RADIUS_M,
  CUE_BALL,
  F,
  GRAVITY_M_S2,
  HALF_L,
  HALF_W,
  hashBalls,
  MU_ROLL,
  newBalls,
  ON_TABLE,
  POCKET_DROP_M,
  PoolSim,
  rack,
  set,
} from '../src/index.ts';

const R = BALL_RADIUS_M;
const park = (b: Float64Array, keep: number[]) => {
  for (let i = 0; i < 16; i++) if (!keep.includes(i)) set(b, i, F.pocket, 0);
};

describe('determinism', () => {
  it('replays a break bit for bit', () => {
    const run = () => {
      const sim = new PoolSim(rack(1234));
      sim.shoot({ dx: 1, dy: 0.013, power: 1, spinX: 0.1, spinY: -0.2 });
      sim.runToRest();
      return hashBalls(sim.balls);
    };
    expect(run()).toBe(run());
  });
});

describe('ball motion', () => {
  it('a stun shot stops the cue ball dead and sends the object ball on', () => {
    const b = newBalls();
    park(b, [0, 1]);
    set(b, 0, F.x, -0.5);
    set(b, 1, F.x, -0.5 + 4 * R); // almost touching: the cue ball arrives still sliding (stun)
    const sim = new PoolSim(b);
    sim.shoot({ dx: 1, dy: 0, power: 0.4, spinX: 0, spinY: -0.35 });
    sim.runToRest();
    const cueTravel = at(b, 0, F.x) + 0.5;
    const objTravel = at(b, 1, F.x) - (-0.5 + 4 * R);
    expect(cueTravel).toBeLessThan(6 * R);
    expect(objTravel).toBeGreaterThan(0.3);
  });

  it('follow runs through, draw comes back', () => {
    const shoot = (spinY: number, power: number) => {
      const b = newBalls();
      park(b, [0, 1]);
      set(b, 0, F.x, -0.6);
      set(b, 1, F.x, -0.2);
      const sim = new PoolSim(b);
      sim.shoot({ dx: 1, dy: 0, power, spinX: 0, spinY });
      sim.runToRest();
      return at(b, 0, F.x);
    };
    expect(shoot(1, 0.12)).toBeGreaterThan(-0.2 + 2 * R);
    expect(shoot(-1, 0.3)).toBeLessThan(-0.3);
  });

  it('a rolling ball stops where v²/2μg says', () => {
    const b = newBalls();
    park(b, [0]);
    set(b, 0, F.x, -HALF_L + 0.2);
    const v = 0.4;
    set(b, 0, F.vx, v);
    set(b, 0, F.wy, v / R); // already rolling
    const sim = new PoolSim(b);
    sim.runToRest();
    const expected = (v * v) / (2 * MU_ROLL * GRAVITY_M_S2);
    expect(at(b, 0, F.x) - (-HALF_L + 0.2)).toBeCloseTo(expected, 2);
  });

  it('bounces off a rail with less speed than it arrived with', () => {
    const b = newBalls();
    park(b, [0]);
    set(b, 0, F.y, HALF_W - 0.2);
    set(b, 0, F.x, 0.5);
    set(b, 0, F.vy, 1.5);
    set(b, 0, F.wx, -1.5 / R);
    const sim = new PoolSim(b);
    for (let i = 0; i < 512 && sim.events.every((e) => e.kind !== 'cushion'); i++) sim.step();
    for (let i = 0; i < 10; i++) sim.step();
    const vy = at(b, 0, F.vy);
    expect(vy).toBeLessThan(0);
    expect(-vy).toBeLessThan(1.5);
    expect(-vy).toBeGreaterThan(0.6);
  });
});

describe('the break', () => {
  it('spreads the rack and settles legally', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const sim = new PoolSim(rack(seed));
      sim.shoot({ dx: 1, dy: 0, power: 1, spinX: 0, spinY: 0 });
      const steps = sim.runToRest();
      expect(steps).toBeLessThan(60 * 512);
      const b = sim.balls;
      const live: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (at(b, i, F.pocket) !== ON_TABLE) continue;
        live.push(i);
        // On the cloth, or at worst hanging in a pocket's jaws.
        expect(Math.abs(at(b, i, F.x))).toBeLessThanOrEqual(HALF_L + POCKET_DROP_M);
        expect(Math.abs(at(b, i, F.y))).toBeLessThanOrEqual(HALF_W + POCKET_DROP_M);
      }
      for (const i of live)
        for (const j of live) {
          if (j <= i) continue;
          const d = Math.hypot(at(b, i, F.x) - at(b, j, F.x), at(b, i, F.y) - at(b, j, F.y));
          expect(d).toBeGreaterThan(2 * R - 1e-4);
        }
      // The rack has opened up: balls well away from where the triangle stood.
      const spread = live.filter((i) => i !== CUE_BALL && at(b, i, F.x) < HALF_L / 2 - 0.1).length;
      expect(spread).toBeGreaterThan(2);
    }
  });
});
