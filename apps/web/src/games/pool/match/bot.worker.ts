/// <reference lib="webworker" />
import {
  type Balls,
  botShot,
  type Call,
  findMake,
  findMiss,
  type RackState,
  type Shot,
} from '@arena/sim-pool';

export type WorkerRequest =
  | { id: number; kind: 'bot'; balls: Balls; rack: RackState; difficulty: number; seed: number }
  | { id: number; kind: 'make' | 'miss'; balls: Balls; base: Shot; call: Call; seed: number };

/** Searches that simulate many shots run here, so a 100–1500 ms think never drops a frame. */
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const r = e.data;
  if (r.kind === 'bot') {
    self.postMessage({ id: r.id, result: botShot(r.balls, r.rack, r.difficulty, r.seed) });
  } else if (r.kind === 'make') {
    self.postMessage({ id: r.id, result: findMake(r.balls, r.base, r.call, r.seed) });
  } else {
    self.postMessage({ id: r.id, result: findMiss(r.balls, r.base, r.call, r.seed) });
  }
};
