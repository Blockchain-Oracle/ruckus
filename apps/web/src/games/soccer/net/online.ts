import { ROOM } from '@arena/protocol';
import {
  SOCCER_INPUT_BYTES,
  SOCCER_MSG,
  SOCCER_SNAPSHOT_HEADER_BYTES,
  type SoccerJoinOptions,
  type SoccerMatchStart,
} from '@arena/protocol/soccer';
import { PROTOCOL_VERSION } from '@arena/shared';
import type { Input } from '@arena/sim-soccer';

import { useProfile } from '@/app/stores/profile.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { createRoomKit } from '@/features/rooms/kit.ts';

import { startOnlineMatch, stopMatch } from '../match/flow.ts';
import { getDriver } from '../match/runtime.ts';

/**
 * The latest match start from the room, held until the scene's driver exists: an invite link can
 * join (and receive it) before Soccer's scene has mounted.
 */
let pending: SoccerMatchStart | null = null;
const inputPacket = new Uint8Array(SOCCER_INPUT_BYTES);
const inputView = new DataView(inputPacket.buffer);

export const soccerRooms = createRoomKit({
  roomName: ROOM.soccer,
  capacity: '4 players + watchers',
  joinOptions: (priv): SoccerJoinOptions => ({
    protocolVersion: PROTOCOL_VERSION,
    name: useProfile.getState().name,
    private: priv,
  }),
  onAttach(room) {
    room.onMessage(SOCCER_MSG.matchStart, (e: SoccerMatchStart) => {
      const machine = useGameMachine.getState();
      if (machine.phase === 'attract') machine.send('entering');
      soccerRooms.useRoom.getState().set({ sheetOpen: false });
      pending = e;
      applyPendingMatch();
    });
    room.onMessage(SOCCER_MSG.snapshot, (packet: Uint8Array) => {
      if (packet.byteLength <= SOCCER_SNAPSHOT_HEADER_BYTES) return;
      const ack = new DataView(packet.buffer, packet.byteOffset, 4).getUint32(0, true);
      // Copy into an aligned buffer: the packet's offset needn't be a multiple of 8.
      const body = packet.slice(SOCCER_SNAPSHOT_HEADER_BYTES);
      getDriver()?.applySnapshot(ack, new Float64Array(body.buffer, 0, body.byteLength / 8));
    });
    // Full time comes from the world itself (snapshots carry it); matchEnd needs no handler.
    room.onMessage(SOCCER_MSG.matchEnd, () => {});
    room.onLeave(() => {
      pending = null;
    });
  },
});

export function applyPendingMatch() {
  const d = getDriver();
  const e = pending;
  if (!d || !e) return;
  pending = null;
  // The server says which slot is ours: seats are renumbered at the start, before the state lands.
  const slot = e.you;
  d.sendInput = sendInput;
  startOnlineMatch(e, slot);
}

function sendInput(seq: number, input: Input) {
  inputView.setUint32(0, seq, true);
  inputView.setInt8(4, input.h);
  inputView.setUint8(5, input.jump ? 1 : 0);
  soccerRooms.sendBytes(SOCCER_MSG.input, inputPacket);
}

/** Back in the room lobby after a match: stand down the pitch view and reopen the lobby sheet. */
export function watchRoomPhase() {
  return soccerRooms.useRoom.subscribe((s, prev) => {
    if (s.phase === 'lobby' && prev.phase !== 'lobby' && s.status === 'inRoom') {
      stopMatch();
      useGameMachine.getState().send('leaving');
      s.set({ sheetOpen: true });
    }
  });
}
