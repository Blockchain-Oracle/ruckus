import { Client, type Room } from '@colyseus/sdk';

import { ROOM } from '@arena/protocol';
import {
  CHICKENZ_MSG,
  type ChickenzJoinOptions,
  INPUT_BYTES,
  type MatchEndEvent,
  type RoundEndEvent,
  type RoundStartEvent,
  SNAPSHOT_HEADER_BYTES,
} from '@arena/protocol/chickenz';
import { PROTOCOL_VERSION } from '@arena/shared';

import { useProfile } from '@/app/stores/profile.ts';
import { writeUrlState } from '@/app/urlState.ts';
import { env } from '@/config/env.ts';

import { useWager } from '../wager/store.ts';
import { type SeatView, useRoom } from './roomStore.ts';

type Handlers = {
  onRoundStart(e: RoundStartEvent): void;
  onRoundEnd(e: RoundEndEvent): void;
  onMatchEnd(e: MatchEndEvent): void;
  onSnapshot(tick: number, ack: number, remote: Int8Array, body: Uint8Array): void;
};

const RECONNECT_TOKEN_KEY = 'ruckus.chickenz.reconnect';
const SLOTS = 4;

let room: Room | null = null;
/** A join in flight: StrictMode double effects and double clicks must not take two seats. */
let joining = false;
let handlers: Handlers | null = null;
const inputPacket = new Uint8Array(INPUT_BYTES);
const inputView = new DataView(inputPacket.buffer);

export const setOnlineHandlers = (h: Handlers | null) => {
  handlers = h;
};

function syncSeats(state: {
  seats: Iterable<SeatView>;
  code: string;
  phase: string;
  hostSessionId: string;
}) {
  const seats = [...state.seats].map((s) => ({ ...s }) as SeatView).sort((a, b) => a.slot - b.slot);
  useRoom
    .getState()
    .set({ seats, code: state.code, phase: state.phase, hostSessionId: state.hostSessionId });
}

function attach(r: Room) {
  room = r;
  writeUrlState({ room: r.roomId });
  try {
    window.sessionStorage.setItem(RECONNECT_TOKEN_KEY, r.reconnectionToken);
  } catch {
    /* reconnect across reloads just won't be offered */
  }
  useRoom
    .getState()
    .set({ status: 'inRoom', error: null, mySessionId: r.sessionId, code: r.roomId });
  r.onStateChange((state) => syncSeats(state as never));
  r.onMessage(CHICKENZ_MSG.roundStart, (e: RoundStartEvent) => handlers?.onRoundStart(e));
  r.onMessage(CHICKENZ_MSG.roundEnd, (e: RoundEndEvent) => handlers?.onRoundEnd(e));
  r.onMessage(CHICKENZ_MSG.matchEnd, (e: MatchEndEvent) => handlers?.onMatchEnd(e));
  r.onMessage(CHICKENZ_MSG.emote, () => {});
  r.onMessage(CHICKENZ_MSG.snapshot, (packet: Uint8Array) => {
    if (packet.byteLength < SNAPSHOT_HEADER_BYTES) return;
    const dv = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    const remote = new Int8Array(SLOTS * 2);
    for (let slot = 0; slot < SLOTS; slot++) {
      remote[slot * 2] = dv.getUint8(8 + slot * 2);
      remote[slot * 2 + 1] = dv.getInt8(9 + slot * 2);
    }
    handlers?.onSnapshot(
      dv.getUint32(0, true),
      dv.getUint32(4, true),
      remote,
      packet.subarray(SNAPSHOT_HEADER_BYTES),
    );
  });
  r.onLeave(() => {
    room = null;
    writeUrlState({ room: null });
    useRoom.getState().set({ status: 'offline', seats: [], code: '', phase: 'lobby' });
  });
}

/** Server and matchmaker errors, in the words a player needs. */
function friendlyError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  if (/locked|full/i.test(raw))
    return 'That room is full (4 players). Ask the host for a new room.';
  if (/not found|invalid|no rooms/i.test(raw))
    return 'No room with that code. Check the code or ask for a fresh link.';
  if (/protocol/i.test(raw)) return 'The game was updated: reload the page to join.';
  return "Couldn't reach the game server. Check your connection and try again.";
}

const joinOptions = (priv: boolean): ChickenzJoinOptions => ({
  protocolVersion: PROTOCOL_VERSION,
  name: useProfile.getState().name,
  hero: useWager.getState().hero,
  private: priv,
});

async function connect(run: (client: Client) => Promise<Room>) {
  if (room || joining) return;
  joining = true;
  useRoom.getState().set({ status: 'connecting', error: null });
  try {
    attach(await run(new Client(env.VITE_SERVER_URL)));
  } catch (cause) {
    useRoom.getState().set({ status: 'error', error: friendlyError(cause) });
  } finally {
    joining = false;
  }
}

/** A private room to share by code or link (friends + optional labelled bots). */
export const createRoom = () => connect((c) => c.create(ROOM.chickenz, joinOptions(true)));
/** Quick Play: any open public room, or a new one. */
export const quickPlay = () => connect((c) => c.joinOrCreate(ROOM.chickenz, joinOptions(false)));
export const joinRoom = (code: string) =>
  connect((c) => c.joinById(code.trim().toUpperCase(), joinOptions(true)));

export async function leaveRoom() {
  const r = room;
  room = null;
  try {
    window.sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
  } catch {
    /* nothing to forget */
  }
  await r?.leave(true).catch(() => {});
  writeUrlState({ room: null });
  useRoom.getState().set({ status: 'offline', seats: [], code: '', phase: 'lobby' });
}

export const sendCommand = (type: string, payload?: unknown) => room?.send(type, payload);

export function sendInput(seq: number, buttons: number, aimX: number) {
  if (!room) return;
  inputView.setUint32(0, seq, true);
  inputView.setUint8(4, buttons);
  inputView.setInt8(5, aimX);
  room.sendBytes(CHICKENZ_MSG.input, inputPacket);
}

export const inRoom = () => room !== null;
