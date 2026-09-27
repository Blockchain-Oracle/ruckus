import { cn } from '@/lib/utils.ts';

export type ChipGroup<T extends string | number | boolean> = {
  /** Accessible name of the group ("Format", "Bots"). */
  name: string;
  value: T;
  options: readonly { v: T; label: string }[];
  onChange(v: T): void;
};

/**
 * Match options as chips on the game card, beside the mode buttons (ADR-010): the choice that
 * shapes the next match is one tap away from Play, not three taps into Settings.
 */
export function OptionChips({
  groups,
}: {
  groups: readonly ChipGroup<string | number | boolean>[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <fieldset key={g.name} className="flex rounded-full border-2 border-line bg-ink/80 p-0.5">
          <legend className="sr-only">{g.name}</legend>
          {g.options.map((o) => (
            <label
              key={String(o.v)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-1 font-display text-xs transition-colors has-focus-visible:outline-2 has-focus-visible:outline-cream',
                g.value === o.v ? 'bg-tomato text-cream' : 'text-cream-dim hover:text-cream',
              )}
            >
              <input
                type="radio"
                name={g.name}
                className="sr-only"
                checked={g.value === o.v}
                onChange={() => g.onChange(o.v)}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
