import { type ChipGroup, OptionChips } from '@/ui/game/OptionChips.tsx';

import type { BotLevel } from '../config.ts';
import { type Format, useSoccerPrefs } from '../prefs.ts';

/** The practice match's shape, on the game card: format and bot level (ADR-010). */
export function SoccerMatchOptions() {
  const { format, level, set } = useSoccerPrefs();
  const groups = [
    {
      name: 'Format',
      value: format,
      options: [
        { v: '1v1', label: '1v1' },
        { v: '1v2', label: '1v2' },
        { v: '2v2', label: '2v2' },
      ],
      onChange: (v) => set({ format: v as Format }),
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
  ] satisfies ChipGroup<string>[];
  return <OptionChips groups={groups} />;
}
