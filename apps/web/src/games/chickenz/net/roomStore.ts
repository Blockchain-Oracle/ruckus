import { create } from 'zustand';

export type SeatView = {
  slot: number;
  kind: 'human' | 'bot';
  sessionId: string;
  name: string;
  hero: string;
  ready: boolean;
  connected: boolean;
  wins: number;
};

export type RoomStatus = 'offline' | 'connecting' | 'inRoom' | 'error';

type RoomState = {
  status: RoomStatus;
  error: string | null;
  code: string;
  phase: string;
  hostSessionId: string;
  mySessionId: string;
  seats: SeatView[];
  set(patch: Partial<Omit<RoomState, 'set'>>): void;
};

export const useRoom = create<RoomState>()((set) => ({
  status: 'offline',
  error: null,
  code: '',
  phase: 'lobby',
  hostSessionId: '',
  mySessionId: '',
  seats: [],
  set: (patch) => set(patch),
}));

export const mySeat = (s: RoomState) =>
  s.seats.find((seat) => seat.sessionId === s.mySessionId) ?? null;
export const isHost = (s: RoomState) => s.hostSessionId !== '' && s.hostSessionId === s.mySessionId;
