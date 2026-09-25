import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';

import { DiamondWipe } from '../hud/DiamondWipe.tsx';
import { MatchHud, MatchResults } from '../hud/MatchHud.tsx';
import { TouchControls, useCoarsePointer } from '../hud/TouchControls.tsx';
import { useMatch } from '../match/store.ts';
import { getDirector } from '../Scene.tsx';
import { BetSheet } from './BetSheet.tsx';
import { useWagerController } from './controller.ts';
import { useWager } from './store.ts';
import { WagerHud } from './WagerHud.tsx';

if (import.meta.env.DEV) {
  // Dev-only handles for browser QA scripts; stripped from production builds.
  Object.assign(globalThis, { __ruckusWager: useWager, __ruckusMatch: useMatch });
}

const leave = () => useGameMachine.getState().send('leaving');

/** Chickenz's DOM layer: match HUD, round wipe, results, the wager sheet and its HUD. */
export function ChickenzOverlay() {
  const { reveal } = useWagerController();
  const wagerPhase = useWager((s) => s.phase);
  const matchStatus = useMatch((s) => s.status);
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  const coarse = useCoarsePointer();
  const controlling =
    matchStatus === 'countdown' || matchStatus === 'playing' || matchStatus === 'roundOver';
  useEffect(() => {
    setGameOwnsHud(wagerPhase !== 'idle' || matchStatus !== 'off');
    setImmersive(matchStatus !== 'off');
    return () => {
      setGameOwnsHud(false);
      setImmersive(false);
    };
  }, [wagerPhase, matchStatus, setGameOwnsHud, setImmersive]);

  return (
    <>
      <MatchHud onLeave={leave} />
      {coarse && controlling && <TouchControls />}
      <DiamondWipe />
      <MatchResults onRematch={() => getDirector()?.rematch()} onLeave={leave} />
      <BetSheet />
      <WagerHud onReveal={reveal} />
    </>
  );
}
