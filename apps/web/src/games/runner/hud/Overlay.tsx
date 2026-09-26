import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';

import { useRunner } from '../match/store.ts';
import { RunnerHud } from './RunnerHud.tsx';

const leave = () => useGameMachine.getState().send('leaving');

/** The Runner's DOM layer: the race HUD owns the screen while a race (or its intro) is up. */
export function RunnerOverlay() {
  const busy = useRunner((s) => s.status !== 'off');
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  useEffect(() => {
    setGameOwnsHud(busy);
    setImmersive(busy);
    return () => {
      setGameOwnsHud(false);
      setImmersive(false);
    };
  }, [busy, setGameOwnsHud, setImmersive]);
  return <RunnerHud onLeave={leave} />;
}
