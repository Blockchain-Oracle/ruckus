/// <reference lib="webworker" />
import { type Balls, botShot, type RackState } from '@arena/sim-pool';

export type BotRequest = {
  id: number;
  balls: Balls;
  rack: RackState;
  difficulty: number;
  seed: number;
};

/** The shot search runs here so a 100–400 ms think never drops a frame. */
self.onmessage = (e: MessageEvent<BotRequest>) => {
  const { id, balls, rack, difficulty, seed } = e.data;
  self.postMessage({ id, decision: botShot(balls, rack, difficulty, seed) });
};
