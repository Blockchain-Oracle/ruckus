import type { GameModes } from '@/engine/types.ts';

import { soccerRooms } from '../net/online.ts';
import { openCallTheFinish } from '../wager/controller.ts';

export const soccerModes: GameModes = {
  friends: () => soccerRooms.useRoom.getState().set({ sheetOpen: true }),
  bet: openCallTheFinish,
};
