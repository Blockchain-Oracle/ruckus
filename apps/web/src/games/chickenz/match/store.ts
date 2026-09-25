import { create } from 'zustand';

import { HEROES, type Hero } from '../sprites.ts';

export type MatchStatus = 'off' | 'wipe' | 'countdown' | 'playing' | 'roundOver' | 'matchOver';

type MatchState = {
  status: MatchStatus;
  round: number;
  wins: number[];
  /** Big yellow centre text (countdown, ROUND N, round/match winner), Chickenz's announce overlay. */
  announce: string | null;
  heroes: Hero[];
  names: string[];
  localSlot: number;
  winner: number;
  /** Diamond wipe: 0 idle, 1 covering, 2 revealing. */
  wipe: 0 | 1 | 2;
  set(patch: Partial<Omit<MatchState, 'set'>>): void;
};

export const useMatch = create<MatchState>()((set) => ({
  status: 'off',
  round: 0,
  wins: [0, 0, 0, 0],
  announce: null,
  heroes: [...HEROES],
  names: ['You', 'Bot', 'Bot', 'Bot'],
  localSlot: 0,
  winner: -1,
  wipe: 0,
  set: (patch) => set(patch),
}));
