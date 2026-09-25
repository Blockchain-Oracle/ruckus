import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { loadChickenzSync, MapId, runBotRound, Sim, VIEW_LEN } from '../src/index.ts';

/** From `cargo test golden_outcome -- --nocapture` (native build). wasm must match bit for bit. */
const GOLDEN = { seed: 1234, winner: 3, ticks: 958, hash: 0x89814e72d9409edan } as const;
const EVEN = [60, 60, 60, 60];

beforeAll(() => {
  loadChickenzSync(
    readFileSync(fileURLToPath(new URL('../pkg/chickenz_sim_bg.wasm', import.meta.url))),
  );
});

describe('chickenz-sim wasm', () => {
  it('matches the native golden round exactly', () => {
    const o = runBotRound(GOLDEN.seed, MapId.Arena, EVEN);
    expect(o.winner).toBe(GOLDEN.winner);
    expect(o.ticks).toBe(GOLDEN.ticks);
    expect(o.hash).toBe(GOLDEN.hash);
  });

  it('per-tick hashes agree between two independent sims and survive snapshot/restore', () => {
    const a = new Sim(99, 4, MapId.Towers);
    const b = new Sim(99, 4, MapId.Towers);
    for (const s of [a, b]) for (let slot = 0; slot < 4; slot++) s.set_bot(slot, 40 + slot * 15);
    for (let t = 0; t < 300; t++) {
      a.step();
      b.step();
      expect(a.hash()).toBe(b.hash());
    }
    const snap = a.snapshot();
    const c = new Sim(1, 2, MapId.Arena);
    expect(c.restore(snap)).toBe(true);
    for (let slot = 0; slot < 4; slot++) c.set_bot(slot, 40 + slot * 15);
    expect(c.hash()).toBe(a.hash());
    expect(c.restore(snap.slice(0, 10))).toBe(false);
  });

  it('fills the render view', () => {
    const s = new Sim(5, 3, MapId.Arena);
    const view = new Int32Array(VIEW_LEN);
    s.step();
    s.view(view);
    expect(view[1]).toBe(1); // tick
    expect(view[7]).toBe(3); // player count
  });
});
