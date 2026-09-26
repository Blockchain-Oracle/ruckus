import { ROOM } from '@arena/protocol';
import {
  RUNNER_INPUT_BYTES,
  RUNNER_MSG,
  RUNNER_SNAPSHOT_HEADER_BYTES,
  type RunnerJoinOptions,
  type RunnerRaceStart,
} from '@arena/protocol/runner';
import { PROTOCOL_VERSION } from '@arena/shared';
import type { Input } from '@arena/sim-runner';

import { useProfile } from '@/app/stores/profile.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { createRoomKit, mySeat } from '@/features/rooms/kit.ts';

import { startOnlineRace, stopRace } from '../match/flow.ts';
import { getDriver } from '../match/runtime.ts';

/**
 * The latest race start from the room, held until the scene's driver exists: an invite link can
 * join (and receive it) before the Runner's scene has mounted.
 */
let pending: RunnerRaceStart | null = null;
const inputPacket = new Uint8Array(RUNNER_INPUT_BYTES);
const inputView = new DataView(inputPacket.buffer);

export const runnerRooms = createRoomKit({
  roomName: ROOM.runner,
  capacity: '4 runners + watchers',
  joinOptions: (priv): RunnerJoinOptions => ({
    protocolVersion: PROTOCOL_VERSION,
    name: useProfile.getState().name,
    private: priv,
  }),
  onAttach(room) {
    room.onMessage(RUNNER_MSG.raceStart, (e: RunnerRaceStart) => {
      const machine = useGameMachine.getState();
      if (machine.phase === 'attract') machine.send('entering');
      runnerRooms.useRoom.getState().set({ sheetOpen: false });
      pending = e;
      applyPendingRace();
    });
    room.onMessage(RUNNER_MSG.snapshot, (packet: Uint8Array) => {
      if (packet.byteLength <= RUNNER_SNAPSHOT_HEADER_BYTES) return;
      const ack = new DataView(packet.buffer, packet.byteOffset, 4).getUint32(0, true);
      // Copy into an aligned buffer: the packet's offset needn't be a multiple of 8.
      const body = packet.slice(RUNNER_SNAPSHOT_HEADER_BYTES);
      getDriver()?.applySnapshot(ack, new Float64Array(body.buffer, 0, body.byteLength / 8));
    });
    // The finish comes from the race itself (snapshots carry it); raceEnd needs no handler.
    room.onMessage(RUNNER_MSG.raceEnd, () => {});
    room.onLeave(() => {
      pending = null;
    });
  },
});

export function applyPendingRace() {
  const d = getDriver();
  const e = pending;
  if (!d || !e) return;
  pending = null;
  const me = mySeat(runnerRooms.useRoom.getState());
  const slot = me && me.kind !== 'waiting' ? me.slot : -1;
  d.sendInput = sendInput;
  startOnlineRace(e, slot);
}

function sendInput(seq: number, input: Input) {
  inputView.setUint32(0, seq, true);
  inputView.setInt8(4, input.h);
  inputView.setUint8(5, input.jump ? 1 : 0);
  inputView.setUint8(6, input.duck ? 1 : 0);
  runnerRooms.sendBytes(RUNNER_MSG.input, inputPacket);
}

/** Back in the room lobby after a race: stand down the road view and reopen the lobby sheet. */
export function watchRoomPhase() {
  return runnerRooms.useRoom.subscribe((s, prev) => {
    if (s.phase === 'lobby' && prev.phase !== 'lobby' && s.status === 'inRoom') {
      stopRace();
      useGameMachine.getState().send('leaving');
      s.set({ sheetOpen: true });
    }
  });
}
