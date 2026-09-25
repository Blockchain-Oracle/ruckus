import { Button } from '@/ui/Button.tsx';

import { getDirector } from '../match/runtime.ts';
import { usePool } from '../match/store.ts';
import { markTutorialDone } from '../match/tutorial.ts';
import { LESSONS } from '../tutorial/lessons.ts';
import { useCoarse } from './useCoarse.ts';

/** First visit: take the one-minute lesson, or go straight to a rack. */
export function TutorialOffer() {
  const offer = usePool((s) => s.offerTutorial);
  if (!offer) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/60 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div className="font-display text-3xl text-cream">New to the table?</div>
        <p className="text-cream-dim">
          A one-minute lesson: aim, power, spin, ball in hand, calling the 8.
        </p>
        <div className="flex gap-3">
          <Button
            variant="tomato"
            sound="ui.confirm"
            onClick={() => getDirector()?.startTutorial()}
          >
            Take the lesson
          </Button>
          <Button
            sound="ui.back"
            onClick={() => {
              markTutorialDone();
              usePool.getState().set({ offerTutorial: false });
              const d = getDirector();
              d?.startMatch(d.playerName);
            }}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The current lesson card, top centre, with a way out. */
export function LessonCard() {
  const { lesson, lessonNote } = usePool();
  const coarse = useCoarse();
  const l = LESSONS[lesson];
  if (lesson < 0 || !l) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-24 sm:bottom-24">
      <div className="pointer-events-auto flex max-w-lg flex-col items-center gap-1 rounded-2xl border-2 border-teal bg-ink/90 px-5 py-3 text-center shadow-[0_0_30px_rgb(46_196_182/0.25)]">
        <div className="font-display text-xs text-teal">
          LESSON {lesson + 1} / {LESSONS.length} · {l.title.toUpperCase()}
        </div>
        <p className="text-sm text-cream">{coarse ? l.touch : l.mouse}</p>
        {lessonNote && <p className="font-display text-sm text-gold">{lessonNote}</p>}
        <button
          type="button"
          className="mt-1 text-xs text-cream-dim underline-offset-2 hover:text-cream hover:underline"
          onClick={() => getDirector()?.finishTutorial()}
        >
          Skip the lesson
        </button>
      </div>
    </div>
  );
}
