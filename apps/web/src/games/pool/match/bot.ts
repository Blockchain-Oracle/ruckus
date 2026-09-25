import type { Balls, BotDecision, RackState } from '@arena/sim-pool';

import type { BotRequest } from './bot.worker.ts';

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (d: BotDecision) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; decision: BotDecision }>) => {
      waiting.get(e.data.id)?.(e.data.decision);
      waiting.delete(e.data.id);
    };
  }
  return worker;
}

/** Ask the bot for a shot off the main thread. */
export function thinkBot(balls: Balls, rack: RackState, difficulty: number, seed: number) {
  return new Promise<BotDecision>((resolve) => {
    const id = nextId++;
    waiting.set(id, resolve);
    const req: BotRequest = { id, balls: new Float64Array(balls), rack, difficulty, seed };
    getWorker().postMessage(req);
  });
}
