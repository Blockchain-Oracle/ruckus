import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { PreMatchCard, type PreMatchIntro } from '@/ui/game/PreMatchCard.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { markControlsSeen } from './controlsSeen.ts';

const MOUSE = [
  ['Move', 'A / D or ← / →'],
  ['Jump', 'W, ↑ or Space. Tap for a hop, hold to jump higher.'],
  ['Kick', 'Just run into the ball. Your whole egg is the boot: hit it on the run to blast it.'],
  ['Header', 'Jump into a dropping ball. The top of your egg sends it up and over.'],
  [
    'Power-ups',
    'Bubbles float mid-pitch. Hit one with the ball: the last egg to touch it gets the effect. Green helps you, yellow changes the ball, red hits the other team.',
  ],
] as const;
const TOUCH = [
  ['Move', 'Thumb anywhere on the left half and slide. Flick up to jump.'],
  ['Jump', 'The big JUMP button. Tap for a hop, hold to jump higher.'],
  ['Kick', 'Just run into the ball. Your whole egg is the boot.'],
  ['Header', 'Jump into a dropping ball to head it.'],
  [
    'Power-ups',
    'Knock the ball through a bubble. Green helps you, yellow changes the ball, red hits the other team.',
  ],
] as const;
const GOAL_LINE =
  'Most goals in 90 seconds wins. You play for Tomato, attacking the goal on the right.';

function Rows() {
  const coarse = useCoarse();
  const rows = coarse ? TOUCH : MOUSE;
  return (
    <>
      <p className="mb-2 text-cream-dim">{GOAL_LINE}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-display text-xs text-gold">{k}</dt>
            <dd className="text-cream">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

const INTRO: PreMatchIntro = {
  title: 'Egg Soccer',
  goal: 'Most goals in 90 seconds wins.',
  keys: [
    ['A / D', 'Run'],
    ['W', 'Jump'],
    ['Run into it', 'Kick'],
  ],
  touch: [
    ['Slide left', 'Run'],
    ['Flick up', 'Jump'],
    ['Run into it', 'Kick'],
  ],
};

/** First visit: the shared pre-match card (ADR-010); the full rules stay behind "?". */
export function IntroCard({ onGo, onLearn }: { onGo: () => void; onLearn: () => void }) {
  const choose = (then: () => void) => () => {
    markControlsSeen();
    then();
  };
  return (
    <PreMatchCard
      intro={INTRO}
      playLabel="Kick off"
      onPlay={choose(onGo)}
      onTutorial={choose(onLearn)}
    />
  );
}

/** One tap away during a match. */
export function ControlsButton() {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        aria-label="How to play"
        onClick={() => setOpen(true)}
        className="pointer-events-auto grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim"
      >
        <QuestionIcon weight="bold" className="size-5" />
      </button>
    );
  return (
    <div className="pointer-events-auto absolute top-0 left-0 max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-teal bg-ink/95 p-4 text-sm shadow-[0_12px_40px_rgb(0_0_0/0.5)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-teal">HOW TO PLAY</span>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="text-cream-dim hover:text-cream"
        >
          <XIcon weight="bold" className="size-4" />
        </button>
      </div>
      <Rows />
    </div>
  );
}
