import { GlobeIcon } from '@phosphor-icons/react';

import { Button } from '@/ui/Button.tsx';

import { useRoomSheet } from '../net/sheetStore.ts';
import { loadWagerSounds } from './audio.ts';
import { useWager } from './store.ts';

/** Cabinet actions beside Play (practice): play online with friends, and the gold money button. */
export function ChickenzHubActions() {
  return (
    <>
      <Button
        variant="teal"
        size="lg"
        sound="ui.confirm"
        onClick={() => useRoomSheet.getState().setOpen(true)}
      >
        <GlobeIcon weight="bold" /> Online
      </Button>
      <Button
        variant="gold"
        size="lg"
        sound="ui.coin"
        onClick={() => {
          void loadWagerSounds();
          useWager.getState().set({ sheetOpen: true });
        }}
      >
        Back a Bird
      </Button>
    </>
  );
}
