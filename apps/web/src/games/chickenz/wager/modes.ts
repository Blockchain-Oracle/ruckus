import type { GameModes } from '@/engine/types.ts';
import { loadWagerSounds } from '@/lib/audio/wager.ts';

import { useRoomSheet } from '../net/sheetStore.ts';
import { useWager } from './store.ts';

export const chickenzModes: GameModes = {
  friends: () => useRoomSheet.getState().setOpen(true),
  bet: () => {
    void loadWagerSounds();
    useWager.getState().set({ sheetOpen: true });
  },
};
