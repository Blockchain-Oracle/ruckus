import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Layout } from '@arena/sim-soccer';

import { safeJSONStorage } from '@/app/stores/safeStorage.ts';

import type { BotLevel } from './config.ts';

/** Practice line-ups: you're always Tomato; every other egg is a bot. */
export const FORMATS = {
  '1v1': 1,
  /** You against two: the hard mode. */
  '1v2': [0, 1, 1],
  '2v2': 2,
} as const satisfies Record<string, Layout>;
export type Format = keyof typeof FORMATS;

type Prefs = {
  format: Format;
  level: BotLevel;
  set(patch: Partial<Pick<Prefs, 'format' | 'level'>>): void;
};

export const useSoccerPrefs = create<Prefs>()(
  persist(
    (set) => ({
      format: '1v1',
      level: 'pro',
      set: (patch) => set(patch),
    }),
    {
      name: 'ruckus.soccer.prefs',
      version: 2,
      storage: safeJSONStorage,
      // v1 stored perTeam (1 | 2).
      migrate: (old) => {
        const v1 = old as { perTeam?: number; level?: BotLevel };
        return { format: v1.perTeam === 2 ? '2v2' : '1v1', level: v1.level ?? 'pro' } as Prefs;
      },
    },
  ),
);
