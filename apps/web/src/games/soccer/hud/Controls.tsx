import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/ui/Button.tsx';

import { markControlsSeen } from './controlsSeen.ts';
import { useCoarse } from './useCoarse.ts';

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
  ['Move', 'Hold ◀ or ▶ bottom left.'],
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

/**
 * First visit: How to play stands between Play and the kickoff. It must fit any screen: capped at
 * the viewport height with only the rules scrolling, and the two choices always visible below.
 */
export function IntroCard({ onGo, onLearn }: { onGo: () => void; onLearn: () => void }) {
  const choose = (then: () => void) => () => {
    markControlsSeen();
    then();
  };
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/55 p-3">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md min-w-0 flex-col rounded-2xl border-2 border-teal bg-ink-2 p-4 text-xs shadow-[0_20px_60px_rgb(0_0_0/0.6)] sm:p-5 sm:text-sm">
        <div className="mb-2 shrink-0 font-display text-xl text-teal sm:mb-3 sm:text-2xl">
          HOW TO PLAY
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1 [@media(max-height:500px)]:pb-4 [@media(max-height:500px)]:[mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
          <Rows />
        </div>
        <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
          <Button
            variant="teal"
            sound="ui.confirm"
            className="w-full min-w-0 px-2 text-sm sm:text-base"
            onClick={choose(onLearn)}
          >
            Quick lesson
          </Button>
          <Button
            variant="tomato"
            sound="ui.confirm"
            className="w-full min-w-0 px-2 text-sm sm:text-base"
            onClick={choose(onGo)}
          >
            Kick off
          </Button>
        </div>
      </div>
    </div>
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
