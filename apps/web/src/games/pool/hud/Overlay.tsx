import { useEffect } from 'react';

import { POOL_MSG, POOL_PLAYERS } from '@arena/protocol/pool';

import { useShell } from '@/app/stores/shell.ts';
import { readUrlState } from '@/app/urlState.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import type { SeatView } from '@/features/rooms/kit.ts';
import { RoomSheet } from '@/features/rooms/RoomSheet.tsx';

import { getDirector } from '../match/runtime.ts';
import { usePool } from '../match/store.ts';
import { poolRooms, watchRoomPhase } from '../net/online.ts';
import { PoolHud } from './PoolHud.tsx';
import { PoolResults } from './Results.tsx';

const leave = () => {
  // Leaving the table online leaves the room too (a labelled bot takes the seat).
  if (poolRooms.inRoom()) void poolRooms.leaveRoom();
  useGameMachine.getState().send('leaving');
};

/** Cue-ball badge for a lobby seat. */
const seatBadge = (seat: SeatView) => (
  <span className="grid size-12 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#f2ecd9_55%,#cfc6ad)] font-display text-lg text-ink shadow-md">
    {seat.slot + 1}
  </span>
);

/** Pool's DOM layer: HUD while a match runs, results at the end. */
export function PoolOverlay() {
  const status = usePool((s) => s.status);
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  const busy = status !== 'off';
  useEffect(() => watchRoomPhase(), []);
  // `?game=pool&room=CODE` invite links drop you straight into that room.
  useEffect(() => {
    const code = readUrlState().room;
    if (code && !poolRooms.inRoom()) {
      poolRooms.useRoom.getState().set({ sheetOpen: true });
      void poolRooms.joinRoom(code);
    }
  }, []);
  const online = poolRooms.useRoom((s) => s.status === 'inRoom');
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
      <PoolResults online={online} onRematch={() => getDirector()?.rematch()} onLeave={leave} />
      <RoomSheet
        kit={poolRooms}
        gameId="pool"
        seats={POOL_PLAYERS}
        minToStart={POOL_PLAYERS}
        avatar={seatBadge}
        commands={{
          ready: POOL_MSG.ready,
          addBot: POOL_MSG.addBot,
          removeBot: POOL_MSG.removeBot,
          start: POOL_MSG.start,
        }}
      />
    </>
  );
}
