import { GlobeIcon } from '@phosphor-icons/react';

import { Button } from '@/ui/Button.tsx';

import { poolRooms } from '../net/online.ts';

/** Pool's extra hub button: play online (rooms with friends, labelled bots, watchers). */
export function PoolHubActions() {
  return (
    <Button
      variant="teal"
      size="lg"
      sound="ui.confirm"
      onClick={() => poolRooms.useRoom.getState().set({ sheetOpen: true })}
    >
      <GlobeIcon weight="bold" /> Online
    </Button>
  );
}
