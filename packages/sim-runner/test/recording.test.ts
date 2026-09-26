import { describe, expect, it } from 'vitest';

import {
  decodeRun,
  encodeRun,
  newWorld,
  packInput,
  recordedInput,
  step,
  TICK_HZ,
  tick,
} from '../src/index.ts';

const MAX_FRAMES = 400 * TICK_HZ;

describe('beat-my-run recordings', () => {
  it('a recorded run replays to the same finish, tick for tick', () => {
    const live = newWorld(21, [90, 40]);
    const frames: number[] = [];
    while (live.phase !== 'over') {
      tick(live);
      frames.push(packInput(live.runners[0]?.input ?? { h: 0, jump: false, duck: false }));
    }
    const bytes = encodeRun({ seed: live.seed, frames: Uint8Array.from(frames) });
    // Well under a kilobyte for a whole race: it travels in a link.
    expect(bytes.length).toBeLessThan(1200);
    const rec = decodeRun(bytes, MAX_FRAMES);
    if (!rec) throw new Error('did not decode');
    expect(rec.seed).toBe(live.seed);

    const replay = newWorld(rec.seed, [-1]);
    const r = replay.runners[0];
    if (!r) throw new Error('no runner');
    for (let t = 0; replay.phase !== 'over'; t++) {
      r.input = recordedInput(rec, t);
      step(replay);
    }
    const orig = live.runners[0];
    expect(r.finished).toBe(orig?.finished);
    expect(r.coins).toBe(orig?.coins);
    expect(r.s).toBe(orig?.s);
  });

  it('rejects junk', () => {
    expect(decodeRun(new Uint8Array([9, 1, 2, 3, 4]), MAX_FRAMES)).toBe(null);
    expect(decodeRun(new Uint8Array([1, 1, 2]), MAX_FRAMES)).toBe(null);
    expect(
      decodeRun(new Uint8Array([1, 0, 0, 0, 1, 0xff, 0xff, 0xff, 0xff, 0x7f, 1]), MAX_FRAMES),
    ).toBe(null);
    expect(decodeRun(new Uint8Array([1, 0, 0, 0, 1, 5, 99]), MAX_FRAMES)).toBe(null);
  });
});
