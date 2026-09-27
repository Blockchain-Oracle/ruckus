import { GraduationCapIcon, PlayIcon } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';

import { Button } from '@/ui/Button.tsx';

import { useCoarse } from './useCoarse.ts';

/** One control hint: the input (a key, or a gesture) and what it does. */
export type Hint = readonly [input: string, does: string];

export type PreMatchIntro = {
  title: string;
  /** The whole goal in one line (ADR-010: no rule walls before playing). */
  goal: string;
  keys: readonly [Hint, Hint, Hint];
  touch: readonly [Hint, Hint, Hint];
};

/** Long enough to read one line and three hints; the match starts on its own after it. */
const AUTO_START_MS = 4500;

/**
 * The first-run card every game shows before its first match: title, one goal line, three control
 * hints, then the match starts by itself. Tutorial is one tap; the full rules live behind "?".
 */
export function PreMatchCard({
  intro,
  playLabel = 'Play',
  onPlay,
  onTutorial,
}: {
  intro: PreMatchIntro;
  playLabel?: string;
  onPlay(): void;
  onTutorial(): void;
}) {
  const coarse = useCoarse();
  const hints = coarse ? intro.touch : intro.keys;
  const done = useRef(false);
  const once = (then: () => void) => () => {
    if (done.current) return;
    done.current = true;
    then();
  };
  useEffect(() => {
    const timer = window.setTimeout(once(onPlay), AUTO_START_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/55 p-3">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-sm min-w-0 flex-col gap-3 overflow-y-auto rounded-[var(--radius-card)] border-2 border-line bg-ink-2 p-5 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)] [@media(max-height:480px)]:max-w-lg [@media(max-height:480px)]:gap-2 [@media(max-height:480px)]:p-4">
        <div className="font-display text-3xl text-cream [@media(max-height:480px)]:text-2xl">
          {intro.title}
        </div>
        <p className="text-cream-dim">{intro.goal}</p>
        <ul className="grid grid-cols-3 gap-2">
          {hints.map(([input, does]) => (
            <li
              key={does}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 border-line bg-ink px-1.5 py-2"
            >
              <span className="font-pixel text-sm leading-tight text-gold">{input}</span>
              <span className="text-xs leading-tight text-cream">{does}</span>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-3">
          <Button sound="ui.click" className="min-w-0 px-3" onClick={once(onTutorial)}>
            <GraduationCapIcon weight="bold" /> Tutorial
          </Button>
          <Button
            variant="tomato"
            sound="ui.confirm"
            className="relative min-w-0 overflow-hidden px-3"
            onClick={once(onPlay)}
          >
            {/* The fill shows the auto-start: tap to go now, or wait. */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-cream/20 motion-safe:animate-[prematch-fill_linear_forwards]"
              style={{ animationDuration: `${AUTO_START_MS}ms` }}
            />
            <PlayIcon weight="fill" className="relative" />
            <span className="relative">{playLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
