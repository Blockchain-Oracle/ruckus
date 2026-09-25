import { Client, type Room } from '@colyseus/sdk';
import { create } from 'zustand';

import { writeUrlState } from '@/app/urlState.ts';
import { env } from '@/config/env.ts';

/** Seat fields every game's room schema shares (games may add more). */
export type SeatView = {
  slot: number;
  kind: 'human' | 'bot' | 'waiting';
  sessionId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  wins: number;
};

export type RoomStatus = 'offline' | 'connecting' | 'inRoom' | 'error';

export type RoomStore = {
  status: RoomStatus;
  error: string | null;
  code: string;
  phase: string;
  hostSessionId: string;
  mySessionId: string;
  seats: SeatView[];
  sheetOpen: boolean;
  set(patch: Partial<Omit<RoomStore, 'set'>>): void;
};

type KitConfig = {
  roomName: string;
  /** "4 players", "2 players": used in the room-full message. */
  capacity: string;
  joinOptions: (priv: boolean) => object;
  /** Register the game's message handlers on a freshly joined room. */
  onAttach: (room: Room) => void;
};

/**
 * One game's online session: join/create/quick-play/leave, the synced seat list, and the lobby
 * sheet's open state. Games plug in their join options and message handlers; the lobby UI
 * (`RoomSheet`) reads the store.
 */
export function createRoomKit(cfg: KitConfig) {
  let room: Room | null = null;
  let joining = false;
  const useRoom = create<RoomStore>()((set) => ({
    status: 'offline',
    error: null,
    code: '',
    phase: 'lobby',
    hostSessionId: '',
    mySessionId: '',
    seats: [],
    sheetOpen: false,
    set: (patch) => set(patch),
  }));

  const friendlyError = (cause: unknown) => {
    const raw = cause instanceof Error ? cause.message : String(cause);
    if (/locked|full/i.test(raw))
      return `That room is full (${cfg.capacity}). Ask the host for a new room.`;
    if (/not found|invalid|no rooms/i.test(raw))
      return 'No room with that code. Check the code or ask for a fresh link.';
    if (/protocol/i.test(raw)) return 'The game was updated: reload the page to join.';
    return "Couldn't reach the game server. Check your connection and try again.";
  };

  function attach(r: Room) {
    room = r;
    writeUrlState({ room: r.roomId });
    useRoom
      .getState()
      .set({ status: 'inRoom', error: null, mySessionId: r.sessionId, code: r.roomId });
    r.onStateChange((state) => {
      const s = state as {
        seats: Iterable<SeatView>;
        code: string;
        phase: string;
        hostSessionId: string;
      };
      const seats = [...s.seats].map((x) => ({ ...x }) as SeatView).sort((a, b) => a.slot - b.slot);
      useRoom
        .getState()
        .set({ seats, code: s.code, phase: s.phase, hostSessionId: s.hostSessionId });
    });
    cfg.onAttach(r);
    r.onLeave(() => {
      room = null;
      writeUrlState({ room: null });
      useRoom.getState().set({ status: 'offline', seats: [], code: '', phase: 'lobby' });
    });
  }

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

  return {
    useRoom,
    createRoom: () => connect((c) => c.create(cfg.roomName, cfg.joinOptions(true))),
    quickPlay: () => connect((c) => c.joinOrCreate(cfg.roomName, cfg.joinOptions(false))),
    joinRoom: (code: string) =>
      connect((c) => c.joinById(code.trim().toUpperCase(), cfg.joinOptions(true))),
    async leaveRoom() {
      const r = room;
      room = null;
      await r?.leave(true).catch(() => {});
      writeUrlState({ room: null });
      useRoom.getState().set({ status: 'offline', seats: [], code: '', phase: 'lobby' });
    },
    send: (type: string, payload?: unknown) => room?.send(type, payload),
    inRoom: () => room !== null,
  };
}

export type RoomKit = ReturnType<typeof createRoomKit>;
export const mySeat = (s: RoomStore) => s.seats.find((x) => x.sessionId === s.mySessionId) ?? null;
export const isHost = (s: RoomStore) => s.hostSessionId !== '' && s.hostSessionId === s.mySessionId;
