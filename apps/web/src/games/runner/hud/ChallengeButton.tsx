import { FlagCheckeredIcon } from '@phosphor-icons/react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { Button } from '@/ui/Button.tsx';

import { queueChallenge } from '../match/flow.ts';
import { clearChallenge, raceClock, readChallenge } from '../net/challenge.ts';

/** Shown above Play when this page came from a "beat my run" link: race that run's ghost. */
export function ChallengeButton() {
  const challenge = readChallenge();
  if (!challenge) return null;
  return (
    <Button
      variant="gold"
      size="lg"
      sound="ui.confirm"
      className="col-span-2 h-12 min-w-0 whitespace-normal"
      title={`${challenge.by} ran it in ${raceClock(challenge.finishTicks)}`}
      onClick={() => {
        queueChallenge(challenge);
        clearChallenge();
        useGameMachine.getState().send('entering');
      }}
    >
      <FlagCheckeredIcon weight="bold" /> Beat {challenge.by} · {raceClock(challenge.finishTicks)}
    </Button>
  );
}
