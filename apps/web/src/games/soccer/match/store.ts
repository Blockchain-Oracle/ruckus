import { create } from 'zustand';

export type SoccerStatus = 'off' | 'intro' | 'tutorial' | 'playing' | 'over';

type SoccerState = {
  status: SoccerStatus;
  /** Seat names, in sim slot order (each player's side is `world.players[i].team`). */
  names: string[];
  /** A room match (server-paced: no local rematch). */
  online: boolean;
  /** Big centre call-outs: countdown, GO!, GOAL!, FULL TIME. */
  announce: { text: string; sub?: string; team?: 0 | 1; key: number } | null;
  set(patch: Partial<Omit<SoccerState, 'set'>>): void;
};

export const useSoccer = create<SoccerState>()((set) => ({
  status: 'off',
  names: [],
  online: false,
  announce: null,
  set: (patch) => set(patch),
}));
