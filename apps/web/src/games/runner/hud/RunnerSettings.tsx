import { cn } from '@/lib/utils.ts';

import type { BotLevel } from '../config.ts';
import { useRunnerPrefs } from '../prefs.ts';

const LEVELS = [
  { v: 'rookie', label: 'Rookie' },
  { v: 'pro', label: 'Pro' },
  { v: 'legend', label: 'Legend' },
] as const satisfies readonly { v: BotLevel; label: string }[];
const GHOSTS = [
  { v: true, label: 'Ghosts on' },
  { v: false, label: 'Ghosts off' },
] as const;

function Segmented<T extends string | boolean>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: readonly { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <label
          key={String(o.v)}
          className={cn(
            'flex-1 cursor-pointer rounded-lg border-2 px-3 py-2 text-center font-display text-sm has-focus-visible:outline-2 has-focus-visible:outline-cream',
            value === o.v
              ? 'border-tomato bg-ink-3 text-cream'
              : 'border-line text-cream-dim hover:border-cream-dim',
          )}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === o.v}
            onChange={() => onChange(o.v)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Practice setup: bot level (from the next race) and whether rivals show as ghosts. */
export function RunnerSettings() {
  const { level, ghosts, set } = useRunnerPrefs();
  return (
    <section className="flex flex-col gap-4 border-t-2 border-line pt-5">
      <h3 className="font-display text-lg text-cream">Neon Dash</h3>
      <div className="flex flex-col gap-2 text-sm">
        <span>Bot level</span>
        <Segmented
          name="runner-level"
          value={level}
          options={LEVELS}
          onChange={(v) => set({ level: v })}
        />
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <span>Rivals on your road</span>
        <Segmented
          name="runner-ghosts"
          value={ghosts}
          options={GHOSTS}
          onChange={(v) => set({ ghosts: v })}
        />
        <span className="text-xs text-cream-dim">
          Ghosts run the same course on top of yours and never block you. Off shows them only on the
          progress rail.
        </span>
      </div>
    </section>
  );
}
