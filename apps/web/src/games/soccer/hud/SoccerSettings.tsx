import { useUi } from '@/app/stores/ui.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';

import type { BotLevel } from '../config.ts';
import { queueLessons, startLessons } from '../match/flow.ts';
import { soccerRooms } from '../net/online.ts';
import { useSoccerPrefs } from '../prefs.ts';

const FORMATS = [
  { v: 1, label: '1 v 1', hint: 'You against one bot' },
  { v: 2, label: '2 v 2', hint: 'You and a bot partner against two bots' },
] as const;
const LEVELS = [
  { v: 'rookie', label: 'Rookie' },
  { v: 'pro', label: 'Pro' },
  { v: 'legend', label: 'Legend' },
] as const satisfies readonly { v: BotLevel; label: string }[];

function Segmented<T extends string | number>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T;
  options: readonly { v: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <label
          key={String(o.v)}
          title={o.hint}
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

/** Practice setup: format and bot level (applies from the next kickoff). */
export function SoccerSettings() {
  const { perTeam, level, set } = useSoccerPrefs();
  return (
    <section className="flex flex-col gap-4 border-t-2 border-line pt-5">
      <h3 className="font-display text-lg text-cream">Soccer</h3>
      <div className="flex flex-col gap-2 text-sm">
        <span>Practice match</span>
        <Segmented
          name="soccer-format"
          value={perTeam}
          options={FORMATS}
          onChange={(v) => set({ perTeam: v })}
        />
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <span>Bot level</span>
        <Segmented
          name="soccer-level"
          value={level}
          options={LEVELS}
          onChange={(v) => set({ level: v })}
        />
      </div>
      <p className="text-xs text-cream-dim">Changes apply from your next match or rematch.</p>
      <Button size="md" sound="ui.confirm" disabled={soccerRooms.inRoom()} onClick={replayTutorial}>
        Replay tutorial
      </Button>
    </section>
  );
}

/** From the hub it queues the lessons and enters; mid-practice it switches straight to them. */
function replayTutorial() {
  useUi.getState().openSheet(null);
  const machine = useGameMachine.getState();
  if (machine.phase === 'play') startLessons();
  else if (machine.phase === 'attract') {
    queueLessons();
    machine.send('entering');
  }
}
