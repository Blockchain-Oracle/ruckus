import type { Balls, BotDecision, Call, RackState, Shot } from '@arena/sim-pool';

import type { WorkerRequest } from './bot.worker.ts';

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (result: unknown) => void>();

type Without<T> = T extends unknown ? Omit<T, 'id'> : never;

function ask<T>(req: Without<WorkerRequest>): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; result: unknown }>) => {
      waiting.get(e.data.id)?.(e.data.result);
      waiting.delete(e.data.id);
    };
  }
  return new Promise<T>((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve as (r: unknown) => void);
    worker?.postMessage({ ...req, id });
  });
}

/** Ask the bot for a shot off the main thread. */
export const thinkBot = (balls: Balls, rack: RackState, difficulty: number, seed: number) =>
  ask<BotDecision>({ kind: 'bot', balls: new Float64Array(balls), rack, difficulty, seed });

/** Call Your Shot: a stroke near `base` that makes the call (null: the call can't go). */
export const searchMake = (balls: Balls, base: Shot, call: Call, seed: number) =>
  ask<Shot | null>({ kind: 'make', balls: new Float64Array(balls), base, call, seed });

/** Call Your Shot: a stroke near `base` that misses, preferably off the jaws. */
export const searchMiss = (balls: Balls, base: Shot, call: Call, seed: number) =>
  ask<Shot>({ kind: 'miss', balls: new Float64Array(balls), base, call, seed });
