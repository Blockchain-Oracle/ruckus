import init, {
  back_bird_class,
  type InitInput,
  initSync,
  run_bot_round,
  Sim,
  view_layout,
} from '../pkg/chickenz_sim.js';
import { assertLayout } from './view.ts';

export * from './input.ts';
export * from './view.ts';
export { Sim };

export type RoundOutcome = {
  winner: number;
  ticks: number;
  kills: number[];
  diedAt: number[];
  health: number[];
  hash: bigint;
};

type SyncInput = Parameters<typeof initSync>[0] extends { module: infer M } ? M : never;

let ready: Promise<void> | null = null;

/** Browser: fetch + instantiate once (pass the bundler's URL for the .wasm). */
export function loadChickenz(wasm: InitInput | Promise<InitInput>): Promise<void> {
  ready ??= init({ module_or_path: wasm }).then(() => assertLayout(view_layout()));
  return ready;
}

/** Node / tests / miner: instantiate synchronously from bytes the caller read. */
export function loadChickenzSync(bytes: SyncInput) {
  initSync({ module: bytes });
  assertLayout(view_layout());
  ready = Promise.resolve();
}

const MAX = 4;

export function runBotRound(
  seed: number,
  mapId: number,
  difficulties: readonly number[],
): RoundOutcome {
  const r = run_bot_round(seed >>> 0, mapId, Int32Array.from(difficulties));
  const at = (i: number) => r[i] ?? 0;
  const hi = BigInt(at(2 + 3 * MAX) >>> 0);
  const lo = BigInt(at(3 + 3 * MAX) >>> 0);
  return {
    winner: at(0),
    ticks: at(1),
    kills: Array.from(r.slice(2, 2 + MAX)),
    diedAt: Array.from(r.slice(2 + MAX, 2 + 2 * MAX)),
    health: Array.from(r.slice(2 + 2 * MAX, 2 + 3 * MAX)),
    hash: (hi << 32n) | lo,
  };
}

/** Back-a-Bird class of slot 0 for a bank exhibition (0 flawless, 1 win, 2 runner-up, 3 lose). */
export const backBirdClass = (seed: number, mapId: number, difficulties: readonly number[]) =>
  back_bird_class(seed >>> 0, mapId, Int32Array.from(difficulties));
