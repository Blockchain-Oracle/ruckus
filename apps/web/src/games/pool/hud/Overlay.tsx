import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';

import { getDirector } from '../match/runtime.ts';
import { usePool } from '../match/store.ts';
import { PoolHud } from './PoolHud.tsx';
import { PoolResults } from './Results.tsx';

const leave = () => useGameMachine.getState().send('leaving');

/** Pool's DOM layer: HUD while a match runs, results at the end. */
export function PoolOverlay() {
  const status = usePool((s) => s.status);
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  const busy = status !== 'off';
  useEffect(() => {
    setGameOwnsHud(busy);
    setImmersive(busy);
    return () => {
      setGameOwnsHud(false);
      setImmersive(false);
    };
  }, [busy, setGameOwnsHud, setImmersive]);
  return (
    <>
      <PoolHud onLeave={leave} />
      <PoolResults onRematch={() => getDirector()?.rematch()} onLeave={leave} />
    </>
  );
}
