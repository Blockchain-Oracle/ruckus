import { create } from 'zustand';

export type SoccerStatus = 'off' | 'intro' | 'playing' | 'over';

type SoccerState = {
  status: SoccerStatus;
  /** Seat names, in sim slot order (team = slot % 2). */
  names: string[];
  /** Big centre call-outs: countdown, GO!, GOAL!, FULL TIME. */
  announce: { text: string; sub?: string; team?: 0 | 1; key: number } | null;
  set(patch: Partial<Omit<SoccerState, 'set'>>): void;
};

export const useSoccer = create<SoccerState>()((set) => ({
  status: 'off',
  names: [],
  announce: null,
  set: (patch) => set(patch),
}));
