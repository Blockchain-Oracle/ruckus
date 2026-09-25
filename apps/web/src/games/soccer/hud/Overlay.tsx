import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';

import { useSoccer } from '../match/store.ts';
import { SoccerHud } from './SoccerHud.tsx';

const leave = () => useGameMachine.getState().send('leaving');

/** Soccer's DOM layer: the match HUD owns the screen while a match (or its intro) is up. */
export function SoccerOverlay() {
  const busy = useSoccer((s) => s.status !== 'off');
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
  return <SoccerHud onLeave={leave} />;
}
