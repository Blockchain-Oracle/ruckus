import { create } from 'zustand';

export type RunnerStatus = 'off' | 'intro' | 'playing' | 'over';

type RunnerState = {
  status: RunnerStatus;
  /** Runner names, in sim slot order. */
  names: string[];
  /** A room race (server-paced: no local rematch). */
  online: boolean;
  /** Big centre call-outs: countdown, GO!, FINISH!, WIPEOUT. */
  announce: { text: string; sub?: string; tone?: string; key: number } | null;
  /** A screen-edge flash for your hits (red) and shield saves (green); `key` restarts it. */
  flash: { kind: 'hit' | 'shield'; key: number } | null;
  set(patch: Partial<Omit<RunnerState, 'set'>>): void;
};

export const useRunner = create<RunnerState>()((set) => ({
  status: 'off',
  names: [],
  online: false,
  announce: null,
  flash: null,
  set: (patch) => set(patch),
}));
