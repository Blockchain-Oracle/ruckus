import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { safeJSONStorage } from '@/app/stores/safeStorage.ts';

import type { BotLevel } from './config.ts';

type Prefs = {
  /** 1v1 against a bot, or 2v2 with a bot partner against two bots. */
  perTeam: 1 | 2;
  level: BotLevel;
  set(patch: Partial<Pick<Prefs, 'perTeam' | 'level'>>): void;
};

export const useSoccerPrefs = create<Prefs>()(
  persist(
    (set) => ({
      perTeam: 1,
      level: 'pro',
      set: (patch) => set(patch),
    }),
    { name: 'ruckus.soccer.prefs', version: 1, storage: safeJSONStorage },
  ),
);
