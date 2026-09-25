import { GlobeIcon, TargetIcon } from '@phosphor-icons/react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { loadWagerSounds } from '@/lib/audio/wager.ts';
import { Button } from '@/ui/Button.tsx';

import { getDirector } from '../match/runtime.ts';
import { poolRooms } from '../net/online.ts';

/** Pool's extra hub buttons: play online, and the Call Your Shot wager. */
export function PoolHubActions() {
  return (
    <>
      <Button
        variant="teal"
        size="lg"
        sound="ui.confirm"
        onClick={() => poolRooms.useRoom.getState().set({ sheetOpen: true })}
      >
        <GlobeIcon weight="bold" /> Online
      </Button>
      <Button
        variant="gold"
        size="lg"
        sound="ui.coin"
        onClick={() => {
          void loadWagerSounds();
          getDirector()?.startWager(Date.now() & 0x7fffffff || 1);
          useGameMachine.getState().send('entering');
        }}
      >
        <TargetIcon weight="bold" /> Call Your Shot
      </Button>
    </>
  );
}
