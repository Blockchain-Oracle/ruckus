import { useGameMachine } from '@/engine/gameMachine.ts';
import type { GameModes } from '@/engine/types.ts';
import { loadWagerSounds } from '@/lib/audio/wager.ts';

import { getDirector } from '../match/runtime.ts';
import { poolRooms } from '../net/online.ts';

export const poolModes: GameModes = {
  friends: () => poolRooms.useRoom.getState().set({ sheetOpen: true }),
  bet: () => {
    void loadWagerSounds();
    // Any positive seed: the table layout is cosmetic; the chain draws make-or-miss.
    getDirector()?.startWager(Date.now() & 0x7fffffff || 1);
    useGameMachine.getState().send('entering');
  },
};
