import { create } from 'zustand';

import type { Group } from '@arena/sim-pool';

export type PoolStatus = 'off' | 'playing' | 'over';

type PoolState = {
  status: PoolStatus;
  names: [string, string];
  bots: [boolean, boolean];
  shooter: 0 | 1;
  groups: [Group | null, Group | null];
  /** Balls left per player's group (7 → 0), or null before groups are set. */
  left: [number | null, number | null];
  /** Short line under the players ("Scratch · ball in hand"). */
  message: string | null;
  ballInHand: 'none' | 'anywhere' | 'kitchen';
  /** The human is on the 8 and must call a pocket. */
  mustCall: boolean;
  calledPocket: number;
  winner: -1 | 0 | 1;
  thinking: boolean;
  rolling: boolean;
  /** Object balls already down (for the players' ball rows). */
  potted: number[];
  /** Whose seat is mine (−1 watching / exhibition). */
  mySlot: number;
  /** It's my turn and the table is waiting for me. */
  myTurn: boolean;
  set(patch: Partial<Omit<PoolState, 'set'>>): void;
};

export const usePool = create<PoolState>()((set) => ({
  status: 'off',
  names: ['You', 'Bot'],
  bots: [false, true],
  shooter: 0,
  groups: [null, null],
  left: [null, null],
  message: null,
  ballInHand: 'none',
  mustCall: false,
  calledPocket: -1,
  winner: -1,
  thinking: false,
  rolling: false,
  potted: [],
  mySlot: -1,
  myTurn: false,
  set: (patch) => set(patch),
}));
