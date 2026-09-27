import type { GameModes } from '@/engine/types.ts';

import { soccerRooms } from '../net/online.ts';
import { openCallTheFinish } from '../wager/controller.ts';
import { SoccerMatchOptions } from './MatchOptions.tsx';

export const soccerModes: GameModes = {
  friends: () => soccerRooms.useRoom.getState().set({ sheetOpen: true }),
  bet: openCallTheFinish,
  Options: SoccerMatchOptions,
};
