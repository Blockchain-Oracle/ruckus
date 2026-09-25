import { create } from 'zustand';

import { loadGame } from '@/games/loader.ts';
import type { GameId } from '@/games/registry.ts';

import { crossfade } from './scrim.ts';

export type Phase = 'attract' | 'entering' | 'play' | 'results' | 'leaving';

/**
 * Legal moves only. `entering` and `leaving` are camera dollies owned by the cameraDirector, which
 * reports arrival; everything else is driven by the UI or the game.
 */
const TRANSITIONS = {
  attract: ['entering'],
  entering: ['play', 'leaving'],
  play: ['results', 'leaving'],
  results: ['entering', 'leaving'],
  leaving: ['attract'],
} as const satisfies Record<Phase, readonly Phase[]>;

type GameMachine = {
  /** null = the Welcome backdrop (no game selected). */
  gameId: GameId | null;
  phase: Phase;
  /** Bumped on every scene swap so per-game state (bots, particles) restarts cleanly. */
  generation: number;
  send(to: Phase): boolean;
  select(gameId: GameId | null): Promise<void>;
};

export const useGameMachine = create<GameMachine>()((set, get) => ({
  gameId: null,
  phase: 'attract',
  generation: 0,
  send(to) {
    const allowed: readonly Phase[] = TRANSITIONS[get().phase];
    if (!allowed.includes(to)) return false;
    set({ phase: to });
    return true;
  },
  async select(gameId) {
    const { phase, gameId: current } = get();
    // Switching cabinets is a hub action; mid-match switches would orphan a room.
    if (phase !== 'attract' || gameId === current) return;
    // Load before fading so the scrim never lifts onto an empty stage.
    if (gameId) await loadGame(gameId);
    await crossfade(() => set((s) => ({ gameId, generation: s.generation + 1 })));
  },
}));

export const isInteractive = (phase: Phase) => phase === 'play';

if (import.meta.env.DEV) {
  (globalThis as { __ruckusMachine?: unknown }).__ruckusMachine = useGameMachine;
}
