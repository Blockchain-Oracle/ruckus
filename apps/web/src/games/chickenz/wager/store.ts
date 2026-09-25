import { create } from 'zustand';

import { HEROES, type Hero } from '../sprites.ts';

/**
 * Back a Bird round lifecycle:
 * idle → placing (host tx) → waiting (VRF) → fight (presented bank seed) → result → idle
 */
export type WagerPhase = 'idle' | 'placing' | 'waiting' | 'fight' | 'result';

export type Fight = {
  sessionId: string;
  seed: number;
  mapId: number;
  outcomeClass: number;
  wager: bigint;
  payout: bigint;
};

type WagerState = {
  phase: WagerPhase;
  sheetOpen: boolean;
  hero: Hero;
  stake: string;
  sessionKey: string | null;
  placedAt: number;
  fight: Fight | null;
  /** Set by the scene when the presented round reaches match over (or is skipped). */
  fightDone: boolean;
  skipRequested: boolean;
  set(patch: Partial<Omit<WagerState, 'set' | 'reset'>>): void;
  reset(): void;
};

const DEFAULT_STAKE = '1';

export const useWager = create<WagerState>()((set) => ({
  phase: 'idle',
  sheetOpen: false,
  hero: HEROES[0],
  stake: DEFAULT_STAKE,
  sessionKey: null,
  placedAt: 0,
  fight: null,
  fightDone: false,
  skipRequested: false,
  set: (patch) => set(patch),
  reset: () =>
    set({
      phase: 'idle',
      sessionKey: null,
      fight: null,
      fightDone: false,
      skipRequested: false,
      placedAt: 0,
    }),
}));

/** Slot order for a presented fight: the backed hero always takes slot 0 (the bank's backed slot). */
export function heroesForFight(backed: Hero): Hero[] {
  return [backed, ...HEROES.filter((h) => h !== backed)];
}
