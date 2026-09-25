import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { safeJSONStorage } from './safeStorage.ts';

/** Music defaults low: it sits next to other tabs, and the research target is ~60%. */
const DEFAULT_MUSIC_VOLUME = 0.6;
const DEFAULT_SFX_VOLUME = 0.9;
const DEFAULT_UI_VOLUME = 0.8;
const SETTINGS_VERSION = 1;

type Settings = {
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  set(patch: Partial<Omit<Settings, 'set'>>): void;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      musicVolume: DEFAULT_MUSIC_VOLUME,
      sfxVolume: DEFAULT_SFX_VOLUME,
      uiVolume: DEFAULT_UI_VOLUME,
      muted: false,
      reducedMotion: prefersReducedMotion(),
      haptics: true,
      set: (patch) => set(patch),
    }),
    { name: 'ruckus.settings', version: SETTINGS_VERSION, storage: safeJSONStorage },
  ),
);
