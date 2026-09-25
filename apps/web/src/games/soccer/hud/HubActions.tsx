import { GlobeIcon } from '@phosphor-icons/react';

import { Button } from '@/ui/Button.tsx';

import { soccerRooms } from '../net/online.ts';

/** Soccer's extra hub button: play online (friends, bots, watchers). */
export function SoccerHubActions() {
  return (
    <Button
      variant="teal"
      size="lg"
      sound="ui.confirm"
      onClick={() => soccerRooms.useRoom.getState().set({ sheetOpen: true })}
    >
      <GlobeIcon weight="bold" /> Online
    </Button>
  );
}
