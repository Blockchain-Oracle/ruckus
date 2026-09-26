import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/ui/Button.tsx';

import { VERB_COLORS } from '../config.ts';
import { markControlsSeen } from './controlsSeen.ts';
import { useCoarse } from './useCoarse.ts';

const KEYS = [
  ['Lanes', 'A / D or ← / →'],
  ['Jump', 'W, ↑ or Space'],
  ['Duck', 'Hold S or ↓ to slide under. In the air it slams you down.'],
] as const;
const TOUCH = [
  ['Lanes', 'Swipe left or right, anywhere.'],
  ['Jump', 'Swipe up.'],
  ['Duck', 'Swipe down to slide under. In the air it slams you down.'],
] as const;
const BARRIERS = [
  ['jump', 'Jump it'],
  ['duck', 'Duck under (or jump)'],
  ['move', 'Change lane'],
  ['strict', 'Duck only'],
] as const;
const RULES = [
  [
    'Coins',
    'Coins are your life: a hit costs 1. Get hit with none left and you wipe out. Each coin you carry is +1% speed (up to +10%).',
  ],
  [
    'Orbs',
    'Green orbs help: speed, magnet, shield, ×2 coins. Red ones hurt: slow, reversed controls, fog. Read the colour before you grab.',
  ],
] as const;
const GOAL =
  'Race three rivals 3 km to the finish line. Everyone runs the same road; the others are ghosts, so nobody blocks you.';

function Rows() {
  const coarse = useCoarse();
  return (
    <>
      <p className="mb-2 text-cream-dim">{GOAL}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {(coarse ? TOUCH : KEYS).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-display text-xs text-gold">{k}</dt>
            <dd className="text-cream">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 mb-1 font-display text-xs text-gold">Barriers: the colour tells you</div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {BARRIERS.map(([verb, text]) => (
          <li key={verb} className="flex items-center gap-2 text-cream">
            <span
              className="inline-block size-3 shrink-0 rounded-sm"
              style={{ background: VERB_COLORS[verb], boxShadow: `0 0 8px ${VERB_COLORS[verb]}` }}
            />
            {text}
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {RULES.map(([k, v]) => (
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
 * First visit: How to play stands between Play and the start. Capped at the viewport height with
 * only the rules scrolling, and the start button always visible below.
 */
export function IntroCard({ onGo, onLearn }: { onGo: () => void; onLearn: () => void }) {
  const choose = (then: () => void) => () => {
    markControlsSeen();
    then();
  };
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/55 p-3">
      <div
        role="dialog"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md min-w-0 flex-col rounded-2xl border-2 border-teal bg-ink-2 p-4 text-xs shadow-[0_20px_60px_rgb(0_0_0/0.6)] sm:p-5 sm:text-sm"
      >
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
            Start the race
          </Button>
        </div>
      </div>
    </div>
  );
}

/** One tap away during a race. */
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
    <div
      role="dialog"
      className="pointer-events-auto absolute top-0 left-0 max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-teal bg-ink/95 p-4 text-sm shadow-[0_12px_40px_rgb(0_0_0/0.5)]"
    >
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
