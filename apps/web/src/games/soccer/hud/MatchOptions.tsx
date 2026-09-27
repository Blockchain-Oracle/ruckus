import { type ChipGroup, OptionChips } from '@/ui/game/OptionChips.tsx';

import type { BotLevel } from '../config.ts';
import { useSoccerPrefs } from '../prefs.ts';

/** The practice match's shape, on the game card: format and bot level (ADR-010). */
export function SoccerMatchOptions() {
  const { perTeam, level, set } = useSoccerPrefs();
  const groups = [
    {
      name: 'Format',
      value: perTeam,
      options: [
        { v: 1, label: '1v1' },
        { v: 2, label: '2v2' },
      ],
      onChange: (v) => set({ perTeam: v as 1 | 2 }),
    },
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
  ] satisfies ChipGroup<string | number>[];
  return <OptionChips groups={groups} />;
}
