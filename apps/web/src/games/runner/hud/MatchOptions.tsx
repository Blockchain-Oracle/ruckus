import { type ChipGroup, OptionChips } from '@/ui/game/OptionChips.tsx';

import type { BotLevel } from '../config.ts';
import { useRunnerPrefs } from '../prefs.ts';

/** The practice race's shape, on the game card: bot level and ghosts (ADR-010). */
export function RunnerMatchOptions() {
  const { level, ghosts, set } = useRunnerPrefs();
  const groups = [
    {
      name: 'Bots',
      value: level,
      options: [
        { v: 'rookie', label: 'Rookie' },
        { v: 'pro', label: 'Pro' },
        { v: 'legend', label: 'Legend' },
      ],
      onChange: (v) => set({ level: v as BotLevel }),
    },
    {
      name: 'Ghosts',
      value: ghosts,
      options: [
        { v: true, label: 'Ghosts on' },
        { v: false, label: 'Off' },
      ],
      onChange: (v) => set({ ghosts: v as boolean }),
    },
  ] satisfies ChipGroup<string | boolean>[];
  return <OptionChips groups={groups} />;
}
