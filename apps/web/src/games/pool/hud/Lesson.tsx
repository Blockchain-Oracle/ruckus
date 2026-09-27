import { PreMatchCard, type PreMatchIntro } from '@/ui/game/PreMatchCard.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { getDirector } from '../match/runtime.ts';
import { usePool } from '../match/store.ts';
import { markTutorialDone } from '../match/tutorial.ts';
import { LESSONS } from '../tutorial/lessons.ts';

const INTRO: PreMatchIntro = {
  title: '8-Ball',
  goal: 'Sink your group (solids or stripes), then call the 8.',
  keys: [
    ['Click', 'Aim'],
    ['Drag the cue', 'Power'],
    ['Let go', 'Shoot'],
  ],
  touch: [
    ['Tap table', 'Aim'],
    ['Pull the cue', 'Power'],
    ['Let go', 'Shoot'],
  ],
};

/** First run: the shared pre-match card (ADR-010) in place of "New to the table?". */
export function TutorialOffer() {
  const offer = usePool((s) => s.offerTutorial);
  if (!offer) return null;
  return (
    <PreMatchCard
      intro={INTRO}
      onTutorial={() => getDirector()?.startTutorial()}
      onPlay={() => {
        markTutorialDone();
        usePool.getState().set({ offerTutorial: false });
        const d = getDirector();
        d?.startMatch(d.playerName);
      }}
    />
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
