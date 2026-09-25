import { create } from 'zustand';

import type { FinishPick, TeamPick } from './calls.ts';

/**
 * Call the Finish round: setup (pick the call, stake) → placing (host tx) → waiting (VRF) →
 * match (the drawn bank match plays) → result → setup again.
 */
export type FinishPhase = 'off' | 'setup' | 'placing' | 'waiting' | 'match' | 'result';

export type FinishResult = {
  sessionId: string;
  made: boolean;
  /** The finish class the match showed. */
  finish: number;
  wager: bigint;
  payout: bigint;
};

type FinishState = {
  phase: FinishPhase;
  team: TeamPick;
  finish: FinishPick;
  stake: string;
  sessionKey: string | null;
  placedAt: number;
  result: FinishResult | null;
  set(patch: Partial<Omit<FinishState, 'set'>>): void;
};

export const useFinishBet = create<FinishState>()((set) => ({
  phase: 'off',
  team: 'tomato',
  finish: 'any',
  stake: '1',
  sessionKey: null,
  placedAt: 0,
  result: null,
  set: (patch) => set(patch),
}));
