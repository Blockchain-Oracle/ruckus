import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { safeJSONStorage } from '@/app/stores/safeStorage.ts';

import type { BotLevel } from './config.ts';

type Prefs = {
  level: BotLevel;
  /** Show the other runners as ghosts on your road (off: HUD only, like DAG Dasher). */
  ghosts: boolean;
  set(patch: Partial<Pick<Prefs, 'level' | 'ghosts'>>): void;
};

export const useRunnerPrefs = create<Prefs>()(
  persist(
    (set) => ({
      level: 'pro',
      ghosts: true,
      set: (patch) => set(patch),
    }),
    { name: 'ruckus.runner.prefs', version: 1, storage: safeJSONStorage },
  ),
);
