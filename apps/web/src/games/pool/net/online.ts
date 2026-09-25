import type { Room } from '@colyseus/sdk';

import { ROOM } from '@arena/protocol';
import {
  type AimUpdate,
  type OverEvent,
  type PlayedEvent,
  POOL_MSG,
  type PoolJoinOptions,
  type RackEvent,
  type ShotRequest,
  tableFrom,
} from '@arena/protocol/pool';
import { PROTOCOL_VERSION } from '@arena/shared';

import { useProfile } from '@/app/stores/profile.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { createRoomKit, mySeat } from '@/features/rooms/kit.ts';

import { aim } from '../match/aim.ts';
import { getDirector } from '../match/runtime.ts';

/** Aim relay rate while it's my turn (watchers see the cue move). */
const AIM_SEND_MS = 100;

let live: Room | null = null;
/**
 * The latest rack from the room, held until the table's director exists: an invite link can
 * join (and receive the rack) before Pool's scene has mounted.
 */
let pendingRack: { e: RackEvent; send: (req: ShotRequest) => void } | null = null;

export function applyPendingRack() {
  const d = getDirector();
  const p = pendingRack;
  if (!d || !p) return;
  pendingRack = null;
  const me = mySeat(poolRooms.useRoom.getState());
  const slot = me && me.kind !== 'waiting' ? me.slot : -1;
  d.startOnline(p.e, tableFrom(p.e.balls), slot, p.send);
}

export const poolRooms = createRoomKit({
  roomName: ROOM.pool,
  capacity: '2 players + watchers',
  joinOptions: (priv): PoolJoinOptions => ({
    protocolVersion: PROTOCOL_VERSION,
    name: useProfile.getState().name,
    private: priv,
  }),
  onAttach(room) {
    live = room;
    room.onMessage(POOL_MSG.rack, (e: RackEvent) => {
      if (import.meta.env.DEV) {
        const g = globalThis as { __poolRacks?: string[] };
        g.__poolRacks = [...(g.__poolRacks ?? []), `${e.seed}:${e.rack.shooter}:${e.rack.isBreak}`];
      }
      const r = poolRooms.useRoom.getState();
      const me = mySeat(r);
      const slot = me && me.kind !== 'waiting' ? me.slot : -1;
      const machine = useGameMachine.getState();
      if (machine.phase === 'attract') machine.send('entering');
      r.set({ sheetOpen: false });
      getDirector()?.startOnline(e, tableFrom(e.balls), slot, (req) =>
        room.send(POOL_MSG.shot, req),
      );
    });
    room.onMessage(POOL_MSG.played, (e: PlayedEvent) => {
      if (import.meta.env.DEV) {
        const g = globalThis as { __poolPlayed?: number };
        g.__poolPlayed = (g.__poolPlayed ?? 0) + 1;
      }
      getDirector()?.onlinePlayed(e, tableFrom(e.before), tableFrom(e.after));
    });
    room.onMessage(POOL_MSG.aim, (a: AimUpdate) => getDirector()?.remoteAim(a));
    room.onMessage(POOL_MSG.over, (e: OverEvent) => getDirector()?.onlineOver(e.winner));
    room.onLeave(() => {
      live = null;
      pendingRack = null;
    });
  },
});

let lastSent = 0;
let lastAim = '';
/** Per frame while it's my turn online: relay the aim (throttled, only when it changed). */
export function relayAim(nowMs: number) {
  if (!live || nowMs - lastSent < AIM_SEND_MS) return;
  const a: AimUpdate = {
    dx: aim.dx,
    dy: aim.dy,
    power: aim.power,
    spinX: aim.spinX,
    spinY: aim.spinY,
  };
  const key = `${a.dx.toFixed(4)},${a.dy.toFixed(4)},${a.power.toFixed(3)},${a.spinX.toFixed(2)},${a.spinY.toFixed(2)}`;
  if (key === lastAim) return;
  lastAim = key;
  lastSent = nowMs;
  live.send(POOL_MSG.aim, a);
}

/** Back in the room lobby after a rack: stand down the table view and reopen the lobby sheet. */
export function watchRoomPhase() {
  return poolRooms.useRoom.subscribe((s, prev) => {
    if (s.phase === 'lobby' && prev.phase !== 'lobby' && s.status === 'inRoom') {
      getDirector()?.startExhibition();
      useGameMachine.getState().send('leaving');
      s.set({ sheetOpen: true });
    }
  });
}
