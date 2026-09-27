import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';

import { Button } from '@/ui/Button.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { startRace } from '../match/flow.ts';
import { tutorial, useTutorial } from '../tutorial/director.ts';
import { LESSONS } from '../tutorial/lessons.ts';

/** The current lesson, bottom centre above the controls: what to do, how it went, a way out. */
export function LessonCard() {
  const { lesson, note, passed, finished } = useTutorial();
  const coarse = useCoarse();
  const l = LESSONS[lesson];
  if (lesson < 0 || !l) return null;
  if (finished)
    return (
      <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/45 px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-teal bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
          <div className="font-display text-3xl text-teal">YOU'RE READY</div>
          <p className="text-cream">
            Dodge the red, jump the cyan, slide under yellow and purple, slam from the air, and read
            the orbs. First to the line wins.
          </p>
          <Button variant="tomato" sound="ui.confirm" className="w-full" onClick={startRace}>
            Start a race
          </Button>
        </div>
      </div>
    );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-16 [@media(pointer:fine)]:top-4">
      <div className="pointer-events-auto flex max-w-lg flex-col items-center gap-1 rounded-2xl border-2 border-teal bg-ink/90 px-5 py-3 text-center shadow-[0_0_30px_rgb(46_196_182/0.25)]">
        <div className="font-display text-xs text-teal">
          LESSON {lesson + 1} / {LESSONS.length} · {l.title.toUpperCase()}
        </div>
        <p className="text-sm text-cream">{coarse ? l.touch : l.mouse}</p>
        {note && (
          <p className={`font-display text-sm ${passed ? 'text-win' : 'text-gold'}`}>{note}</p>
        )}
        <div className="mt-1 flex gap-4 text-xs text-cream-dim">
          <button
            type="button"
            className="inline-flex items-center gap-1 hover:text-cream"
            onClick={() => tutorial.stage()}
          >
            <ArrowCounterClockwiseIcon weight="bold" /> Reset
          </button>
          <button
            type="button"
            className="underline-offset-2 hover:text-cream hover:underline"
            onClick={() => {
              tutorial.finish();
              startRace();
            }}
          >
            Skip the lessons
          </button>
        </div>
      </div>
    </div>
  );
}
