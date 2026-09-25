import { create } from 'zustand';

import type { Call, Shot } from '@arena/sim-pool';

/**
 * Call Your Shot round: setup (aim, stake) → checking (is the call makeable?) → placing (host tx)
 * → waiting (VRF) → shot (the realised stroke plays) → result → setup again.
 */
export type ShotBetPhase = 'off' | 'setup' | 'checking' | 'placing' | 'waiting' | 'shot' | 'result';

export type ShotResult = {
  sessionId: string;
  made: boolean;
  wager: bigint;
  payout: bigint;
  call: Call;
};

type ShotBetState = {
  phase: ShotBetPhase;
  stake: string;
  /** What the aim currently calls (null: not a pottable line). */
  call: Call | null;
  /** The make-able stroke found for the placed call, and the player's own stroke. */
  makeShot: Shot | null;
  base: Shot | null;
  sessionKey: string | null;
  placedAt: number;
  layoutSeed: number;
  result: ShotResult | null;
  set(patch: Partial<Omit<ShotBetState, 'set'>>): void;
};

export const useShotBet = create<ShotBetState>()((set) => ({
  phase: 'off',
  stake: '1',
  call: null,
  makeShot: null,
  base: null,
  sessionKey: null,
  placedAt: 0,
  layoutSeed: 1,
  result: null,
  set: (patch) => set(patch),
}));
