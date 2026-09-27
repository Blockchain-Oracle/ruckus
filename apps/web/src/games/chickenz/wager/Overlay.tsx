import { useEffect } from 'react';

import { useShell } from '@/app/stores/shell.ts';
import { readUrlState } from '@/app/urlState.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { ConnectionBanner } from '@/features/rooms/ConnectionBanner.tsx';

import { skipTutorial, startTutorial } from '../flow.ts';
import { DiamondWipe } from '../hud/DiamondWipe.tsx';
import { MatchHud, MatchResults } from '../hud/MatchHud.tsx';
import { Onboarding } from '../hud/Onboarding.tsx';
import { RotateHint } from '../hud/RotateHint.tsx';
import { TouchControls, useCoarsePointer } from '../hud/TouchControls.tsx';
import { TutorialHud } from '../hud/TutorialHud.tsx';
import { getDirectors } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { installOnline } from '../net/online.ts';
import { RoomSheet } from '../net/RoomSheet.tsx';
import { useRoom } from '../net/roomStore.ts';
import { inRoom, joinRoom, leaveRoom } from '../net/session.ts';
import { useRoomSheet } from '../net/sheetStore.ts';
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

const leave = () => {
  // Leaving a networked match leaves the room too (a labelled bot takes the seat).
  if (inRoom()) void leaveRoom();
  useGameMachine.getState().send('leaving');
};

/** Chickenz's DOM layer: match HUD, round wipe, results, the wager sheet and its HUD. */
export function ChickenzOverlay() {
  const { reveal } = useWagerController();
  useEffect(() => installOnline(), []);
  // `?game=chickenz&room=CODE` invite links drop you straight into that room's lobby.
  useEffect(() => {
    const code = readUrlState().room;
    if (code && !inRoom()) {
      useRoomSheet.getState().setOpen(true);
      void joinRoom(code);
    }
  }, []);
  const wagerPhase = useWager((s) => s.phase);
  const matchStatus = useMatch((s) => s.status);
  const tutorialStep = useTutorial((s) => s.step);
  const onboarding = useOnboarding((s) => s.stage);
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  const coarse = useCoarsePointer();
  const roomStatus = useRoom((s) => s.status);
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
      {coarse && busy && <RotateHint />}
      <DiamondWipe />
      <MatchResults
        online={roomStatus === 'inRoom'}
        onRematch={() => getDirectors()?.match.rematch()}
        onLeave={leave}
      />
      <TutorialHud
        onSkip={() => {
          getDirectors()?.tutorial.skip();
        }}
      />
      <Onboarding onTutorial={startTutorial} onSkip={skipTutorial} />
      <ConnectionBanner />
      <RoomSheet />
      <BetSheet />
      <WagerHud onReveal={reveal} />
    </>
  );
}
