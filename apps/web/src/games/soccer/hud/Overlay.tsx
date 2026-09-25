import { useEffect } from 'react';

import { SOCCER_MIN_TO_START, SOCCER_MSG, SOCCER_SEATS } from '@arena/protocol/soccer';

import { useShell } from '@/app/stores/shell.ts';
import { readUrlState } from '@/app/urlState.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import type { SeatView } from '@/features/rooms/kit.ts';
import { RoomSheet } from '@/features/rooms/RoomSheet.tsx';

import { KITS } from '../config.ts';
import { useSoccer } from '../match/store.ts';
import { soccerRooms, watchRoomPhase } from '../net/online.ts';
import { SoccerHud } from './SoccerHud.tsx';

const leave = () => {
  // Leaving the pitch online leaves the room too (a labelled bot takes the egg).
  if (soccerRooms.inRoom()) void soccerRooms.leaveRoom();
  useGameMachine.getState().send('leaving');
};

/** A lobby seat as a little egg in its team's kit (even slots Tomato, odd Violet). */
const seatBadge = (seat: SeatView) => {
  const kit = KITS[(seat.slot % 2) as 0 | 1] ?? KITS[0];
  return (
    <span
      title={`Team ${kit.name}`}
      className="grid h-12 w-10 place-items-center rounded-[50%/60%_60%_40%_40%] border-2 border-ink font-display text-sm text-cream shadow-md"
      style={{ background: kit.body }}
    >
      {seat.slot < SOCCER_SEATS ? kit.name[0] : ''}
    </span>
  );
};

/** Soccer's DOM layer: the match HUD owns the screen while a match (or its intro) is up. */
export function SoccerOverlay() {
  const busy = useSoccer((s) => s.status !== 'off');
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  useEffect(() => watchRoomPhase(), []);
  // `?game=soccer&room=CODE` invite links drop you straight into that room.
  useEffect(() => {
    const code = readUrlState().room;
    if (code && !soccerRooms.inRoom()) {
      soccerRooms.useRoom.getState().set({ sheetOpen: true });
      void soccerRooms.joinRoom(code);
    }
  }, []);
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
      <SoccerHud onLeave={leave} />
      <RoomSheet
        kit={soccerRooms}
        gameId="soccer"
        seats={SOCCER_SEATS}
        minToStart={SOCCER_MIN_TO_START}
        avatar={seatBadge}
        extra={
          <p className="text-xs text-cream-dim">
            Two players play 1v1. Three or four play 2v2, and a labelled bot fills any gap. Even
            seats are Tomato, odd seats are Violet.
          </p>
        }
        commands={{
          ready: SOCCER_MSG.ready,
          addBot: SOCCER_MSG.addBot,
          removeBot: SOCCER_MSG.removeBot,
          start: SOCCER_MSG.start,
        }}
      />
    </>
  );
}
