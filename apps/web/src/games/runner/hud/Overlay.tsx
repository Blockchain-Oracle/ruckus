import { useEffect } from 'react';

import { RUNNER_MIN_TO_START, RUNNER_MSG, RUNNER_SEATS } from '@arena/protocol/runner';

import { useShell } from '@/app/stores/shell.ts';
import { readUrlState } from '@/app/urlState.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { ConnectionBanner } from '@/features/rooms/ConnectionBanner.tsx';
import type { SeatView } from '@/features/rooms/kit.ts';
import { RoomSheet } from '@/features/rooms/RoomSheet.tsx';

import { SLOTS } from '../config.ts';
import { useRunner } from '../match/store.ts';
import { applyPendingRace, runnerRooms, watchRoomPhase } from '../net/online.ts';
import { closeCallTheWipeout, useWipeoutController } from '../wager/controller.ts';
import { useWipeoutBet } from '../wager/store.ts';
import { WipeoutHud } from '../wager/WipeoutHud.tsx';
import { RunnerHud } from './RunnerHud.tsx';

const leave = () => {
  if (useWipeoutBet.getState().phase !== 'off') closeCallTheWipeout();
  // Leaving the road online leaves the room too (a labelled bot takes the runner).
  if (runnerRooms.inRoom()) void runnerRooms.leaveRoom();
  useGameMachine.getState().send('leaving');
};

/** A lobby seat as a runner chip in that seat's colour. */
const seatBadge = (seat: SeatView) => {
  const look = SLOTS[seat.slot] ?? SLOTS[0];
  return (
    <span
      title={look.name}
      className="grid size-11 place-items-center rounded-xl border-2 border-ink font-display text-sm text-ink shadow-md"
      style={{ background: seat.slot < RUNNER_SEATS ? look.color : '#4a2d5e' }}
    >
      {seat.slot < RUNNER_SEATS ? seat.slot + 1 : ''}
    </span>
  );
};

/** The Runner's DOM layer: the race HUD owns the screen while a race (or its intro) is up. */
export function RunnerOverlay() {
  const betting = useWipeoutBet((s) => s.phase !== 'off');
  const busy = useRunner((s) => s.status !== 'off') || betting;
  useWipeoutController();
  const setGameOwnsHud = useShell((s) => s.setGameOwnsHud);
  const setImmersive = useShell((s) => s.setImmersive);
  useEffect(() => watchRoomPhase(), []);
  // A race start that arrived before the scene existed (invite links) takes over now.
  useEffect(() => applyPendingRace(), []);
  // `?game=runner&room=CODE` invite links drop you straight into that room.
  useEffect(() => {
    const code = readUrlState().room;
    if (code && !runnerRooms.inRoom()) {
      runnerRooms.useRoom.getState().set({ sheetOpen: true });
      void runnerRooms.joinRoom(code);
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
      <RunnerHud onLeave={leave} />
      <WipeoutHud onLeave={leave} />
      <ConnectionBanner />
      <RoomSheet
        kit={runnerRooms}
        gameId="runner"
        seats={RUNNER_SEATS}
        minToStart={RUNNER_MIN_TO_START}
        avatar={seatBadge}
        extra={
          <p className="text-xs text-cream-dim">
            Everyone races the same course at the same time; rivals show as ghosts, so nobody blocks
            anybody. Fill empty seats with labelled bots.
          </p>
        }
        commands={{
          ready: RUNNER_MSG.ready,
          addBot: RUNNER_MSG.addBot,
          removeBot: RUNNER_MSG.removeBot,
          start: RUNNER_MSG.start,
        }}
      />
    </>
  );
}
