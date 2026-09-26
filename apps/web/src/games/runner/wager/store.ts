import { create } from 'zustand';

/**
 * Call the Wipeout round: setup (pick the call, stake) → placing (host tx) → waiting (VRF) →
 * run (the drawn bank gauntlet plays) → result → setup again.
 */
export type WipeoutPhase = 'off' | 'setup' | 'placing' | 'waiting' | 'run' | 'result';

export type WipeoutResult = {
  sessionId: string;
  made: boolean;
  /** The ending the gauntlet showed (index into WIPEOUT_CLASSES). */
  ending: number;
  wager: bigint;
  payout: bigint;
};

type WipeoutState = {
  phase: WipeoutPhase;
  /** Index into WIPEOUT_CALLS. */
  call: number;
  stake: string;
  sessionKey: string | null;
  placedAt: number;
  result: WipeoutResult | null;
  set(patch: Partial<Omit<WipeoutState, 'set'>>): void;
};

export const useWipeoutBet = create<WipeoutState>()((set) => ({
  phase: 'off',
  call: 0,
  stake: '1',
  sessionKey: null,
  placedAt: 0,
  result: null,
  set: (patch) => set(patch),
}));
