import { type Balls, readCall } from '@arena/sim-pool';

import { aim } from '../match/aim.ts';
import { useShotBet } from './store.ts';

let last = '';
/** Per frame while calling: what the aim calls, pushed to the HUD only when it changes. */
export function readWagerCall(balls: Balls) {
  const call = readCall(balls, aim.dx, aim.dy);
  const key = call ? `${call.ball}:${call.pocket}:${call.tier}` : '';
  if (key === last) return;
  last = key;
  useShotBet.getState().set({ call });
}
