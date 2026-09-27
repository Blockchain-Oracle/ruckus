import type { GameModes } from '@/engine/types.ts';

import { runnerRooms } from '../net/online.ts';
import { openCallTheWipeout } from '../wager/controller.ts';
import { ChallengeButton } from './ChallengeButton.tsx';

export const runnerModes: GameModes = {
  friends: () => runnerRooms.useRoom.getState().set({ sheetOpen: true }),
  bet: openCallTheWipeout,
  Extra: ChallengeButton,
};
