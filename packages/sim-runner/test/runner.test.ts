import { describe, expect, it } from 'vitest';

import {
  buildCourse,
  COURSE_M,
  type Entity,
  HIT_COST,
  hashWorld,
  IDLE,
  type Input,
  newWorld,
  PLATFORMS,
  packWorld,
  START_COINS,
  speedOf,
  standings,
  step,
  TICK_HZ,
  takenWords,
  tick,
  unpackWorld,
  type World,
} from '../src/index.ts';

/** A one-human race on a hand-built road, already past the countdown. */
function track(course: Entity[]): World {
  const w = newWorld(1, [-1]);
  w.course = course;
  for (const r of w.runners) r.taken = new Uint32Array(takenWords(course));
  while (w.phase === 'countdown') step(w);
  return w;
}

const me = (w: World) => {
  const r = w.runners[0];
  if (!r) throw new Error('no runner');
  return r;
};

/** Steps with `input` until the runner reaches `s` (held input, like a finger on a key). */
function runTo(w: World, s: number, input: Input = IDLE) {
  me(w).input = { ...input };
  while (me(w).s < s && w.phase === 'run' && !me(w).out) step(w);
}

/** One tick with `input`, then let go (a tap). */
function press(w: World, input: Input) {
  me(w).input = { ...input };
  step(w);
  me(w).input = { ...IDLE };
}

const BARRIER_AT = 60;
const barrier = (id: Entity & { kind: 'barrier' }): Entity[] => [id];

/** Meets a barrier with a verb; returns whether it cost a hit. */
function meet(id: 'jumpSingle' | 'duckSingle' | 'moveSingle' | 'duckStrict', verb: string) {
  const lanes = id === 'duckStrict' ? 0b111 : 0b010;
  const w = track(barrier({ kind: 'barrier', s: BARRIER_AT, barrier: id, lanes }));
  const r = me(w);
  if (verb === 'jump') {
    runTo(w, BARRIER_AT - speedOf(r) * 0.4);
    press(w, { ...IDLE, jump: true });
  } else if (verb === 'duck') {
    runTo(w, BARRIER_AT - 4);
    runTo(w, BARRIER_AT + 4, { ...IDLE, duck: true });
  } else if (verb === 'move') {
    runTo(w, BARRIER_AT - 10);
    press(w, { ...IDLE, h: -1 });
  }
  runTo(w, BARRIER_AT + 10);
  return r.coins < START_COINS;
}

describe('the barrier grammar: each colour is beaten by its verb only', () => {
  it('cyan: jump clears it, ducking does not', () => {
    expect(meet('jumpSingle', 'jump')).toBe(false);
    expect(meet('jumpSingle', 'duck')).toBe(true);
    expect(meet('jumpSingle', 'none')).toBe(true);
  });
  it('yellow: duck (or jump) clears it', () => {
    expect(meet('duckSingle', 'duck')).toBe(false);
    expect(meet('duckSingle', 'jump')).toBe(false);
    expect(meet('duckSingle', 'none')).toBe(true);
  });
  it('red: only a lane change', () => {
    expect(meet('moveSingle', 'move')).toBe(false);
    expect(meet('moveSingle', 'jump')).toBe(true);
    expect(meet('moveSingle', 'duck')).toBe(true);
  });
  it('purple: only a duck (too tall to jump)', () => {
    expect(meet('duckStrict', 'duck')).toBe(false);
    expect(meet('duckStrict', 'jump')).toBe(true);
  });
});

describe('runner rules', () => {
  it('runs onto a platform, collects over it, and drops off the end', () => {
    const { lengthM, heightM } = PLATFORMS.long;
    const w = track([
      { kind: 'platform', s: 40, lane: 1, platform: 'long', lengthM, y: heightM },
      { kind: 'coin', s: 43, lane: 1, y: heightM + 0.8 },
    ]);
    runTo(w, 42);
    expect(me(w).y).toBe(heightM);
    runTo(w, 44);
    expect(me(w).coins).toBe(START_COINS + 10);
    runTo(w, 40 + lengthM + 8);
    expect(me(w).y).toBe(0);
  });

  it('a hit you can’t pay for is a wipeout', () => {
    const w = track([{ kind: 'barrier', s: 40, barrier: 'jumpFull', lanes: 0b111 }]);
    me(w).coins = HIT_COST - 10;
    runTo(w, 50);
    expect(me(w).out).toBe(true);
  });

  it('a shield eats one hit', () => {
    const w = track([{ kind: 'barrier', s: 40, barrier: 'jumpFull', lanes: 0b111 }]);
    me(w).power = 'shield';
    me(w).powerTicks = 600;
    runTo(w, 50);
    expect(me(w).coins).toBe(START_COINS);
    expect(me(w).power).toBe(null);
  });

  it('ducking in the air slams you down', () => {
    const air = (slam: boolean) => {
      const w = track([]);
      runTo(w, 20);
      press(w, { ...IDLE, jump: true });
      for (let i = 0; i < 12; i++) step(w);
      let t = 0;
      me(w).input = { ...IDLE, duck: slam };
      while (!me(w).grounded) {
        step(w);
        t += 1;
      }
      return t;
    };
    expect(air(true)).toBeLessThan(air(false) / 2);
  });

  it('builds the same sorted course for a seed, clear of the finish', () => {
    const a = buildCourse(42);
    expect(buildCourse(42)).toEqual(a);
    expect(a.length).toBeGreaterThan(100);
    expect(a.every((e, i) => i === 0 || (a[i - 1] as Entity).s <= e.s)).toBe(true);
    expect((a.at(-1) as Entity).s).toBeLessThan(COURSE_M);
  });
});

describe('races', () => {
  const race = (seed: number, bots: number[]) => {
    const w = newWorld(seed, bots);
    while (w.phase !== 'over') tick(w);
    return w;
  };

  it('is deterministic with bots', () => {
    expect(hashWorld(race(7, [20, 50, 80, 100]))).toBe(hashWorld(race(7, [20, 50, 80, 100])));
  });

  it('sharp bots beat weak ones over a season', () => {
    let wins = 0;
    for (let seed = 1; seed <= 8; seed++) if (standings(race(seed, [100, 10]))[0] === 0) wins += 1;
    expect(wins).toBeGreaterThanOrEqual(7);
  });

  it('a clean run finishes in about two minutes', () => {
    const w = race(3, [100]);
    const r = me(w);
    expect(r.finished / TICK_HZ).toBeGreaterThan(90);
    expect(r.finished / TICK_HZ).toBeLessThan(130);
  });
});

describe('snapshots', () => {
  it('pack → unpack continues bit-identically (the room netcode relies on it)', () => {
    const a = newWorld(9, [30, 60, 90, 100]);
    for (let i = 0; i < 40 * TICK_HZ; i++) tick(a);
    const b = newWorld(1, [0, 0, 0, 0]);
    expect(unpackWorld(b, packWorld(a))).toBe(true);
    expect(hashWorld(b)).toBe(hashWorld(a));
    for (let i = 0; i < 60 * TICK_HZ; i++) {
      tick(a);
      tick(b);
    }
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('refuses a snapshot with a different field', () => {
    expect(unpackWorld(newWorld(1, [0]), packWorld(newWorld(1, [0, 0])))).toBe(false);
  });
});
