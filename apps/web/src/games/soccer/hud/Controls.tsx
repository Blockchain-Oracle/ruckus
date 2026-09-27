import { HelpPanel } from '@/ui/game/HelpPanel.tsx';
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
  return (
    <HelpPanel>
      <Rows />
    </HelpPanel>
  );
}
