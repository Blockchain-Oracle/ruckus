import { GlobeIcon, TargetIcon } from '@phosphor-icons/react';

import { Button } from '@/ui/Button.tsx';

import { soccerRooms } from '../net/online.ts';
import { openCallTheFinish } from '../wager/controller.ts';

/** Soccer's extra hub buttons: play online (friends, bots, watchers) and Call the Finish. */
export function SoccerHubActions() {
  return (
    <>
      <Button
        variant="teal"
        size="lg"
        sound="ui.confirm"
        onClick={() => soccerRooms.useRoom.getState().set({ sheetOpen: true })}
      >
        <GlobeIcon weight="bold" /> Online
      </Button>
      <Button variant="gold" size="lg" sound="ui.coin" onClick={openCallTheFinish}>
        <TargetIcon weight="bold" /> Call the Finish
      </Button>
    </>
  );
}
