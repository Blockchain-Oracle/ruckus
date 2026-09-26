import { FlagCheckeredIcon, GlobeIcon, LightningIcon } from '@phosphor-icons/react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { Button } from '@/ui/Button.tsx';

import { queueChallenge } from '../match/flow.ts';
import { clearChallenge, raceClock, readChallenge } from '../net/challenge.ts';
import { runnerRooms } from '../net/online.ts';
import { openCallTheWipeout } from '../wager/controller.ts';

/**
 * The Runner's extra hub buttons: race online (friends, bots, watchers), Call the Wipeout (the
 * wager), and when this page came from a "beat my run" link, race that run's ghost.
 */
export function RunnerHubActions() {
  const challenge = readChallenge();
  return (
    <>
      {challenge && (
        <Button
          variant="gold"
          size="lg"
          sound="ui.confirm"
          title={`${challenge.by} ran it in ${raceClock(challenge.finishTicks)}`}
          onClick={() => {
            queueChallenge(challenge);
            clearChallenge();
            useGameMachine.getState().send('entering');
          }}
        >
          <FlagCheckeredIcon weight="bold" /> Beat {challenge.by} ·{' '}
          {raceClock(challenge.finishTicks)}
        </Button>
      )}
      <Button
        variant="teal"
        size="lg"
        sound="ui.confirm"
        onClick={() => runnerRooms.useRoom.getState().set({ sheetOpen: true })}
      >
        <GlobeIcon weight="bold" /> Online
      </Button>
      <Button variant="gold" size="lg" sound="ui.coin" onClick={openCallTheWipeout}>
        <LightningIcon weight="bold" /> Call the Wipeout
      </Button>
    </>
  );
}
