import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';

import { skipTutorial, startMatch, startTutorial } from '../flow.ts';
import { DiamondWipe } from '../hud/DiamondWipe.tsx';
import { MatchHud, MatchResults } from '../hud/MatchHud.tsx';
import { Onboarding } from '../hud/Onboarding.tsx';
import { TouchControls, useCoarsePointer } from '../hud/TouchControls.tsx';
import { TutorialHud } from '../hud/TutorialHud.tsx';
import { getDirectors } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { useTutorial } from '../tutorial/director.ts';
import { useOnboarding } from '../tutorial/onboarding.ts';
import { BetSheet } from './BetSheet.tsx';
import { useWagerController } from './controller.ts';
import { useWager } from './store.ts';
import { WagerHud } from './WagerHud.tsx';

if (import.meta.env.DEV) {
  // Dev-only handles for browser QA scripts; stripped from production builds.
  Object.assign(globalThis, {
    __ruckusWager: useWager,
    __ruckusMatch: useMatch,
    __ruckusTutorial: useTutorial,
  });
}

const leave = () => useGameMachine.getState().send('leaving');

/** Chickenz's DOM layer: match HUD, round wipe, results, the wager sheet and its HUD. */
export function ChickenzOverlay() {
  const { reveal } = useWagerController();
  const wagerPhase = useWager((s) => s.phase);
  const matchStatus = useMatch((s) => s.status);
  const tutorialStep = useTutorial((s) => s.step);
  const onboarding = useOnboarding((s) => s.stage);
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  const coarse = useCoarsePointer();
  const controlling =
    matchStatus === 'countdown' ||
    matchStatus === 'playing' ||
    matchStatus === 'roundOver' ||
    tutorialStep >= 0;
  const busy = matchStatus !== 'off' || tutorialStep >= 0 || onboarding !== 'none';
  useEffect(() => {
    setGameOwnsHud(wagerPhase !== 'idle' || busy);
    setImmersive(busy);
    return () => {
      setGameOwnsHud(false);
      setImmersive(false);
    };
  }, [wagerPhase, busy, setGameOwnsHud, setImmersive]);

  return (
    <>
      <MatchHud onLeave={leave} />
      {coarse && controlling && <TouchControls />}
      <DiamondWipe />
      <MatchResults onRematch={() => getDirectors()?.match.rematch()} onLeave={leave} />
      <TutorialHud
        onSkip={() => {
          getDirectors()?.tutorial.skip();
        }}
      />
      <Onboarding onTutorial={startTutorial} onSkip={skipTutorial} onNamed={startMatch} />
      <BetSheet />
      <WagerHud onReveal={reveal} />
    </>
  );
}
