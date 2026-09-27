import { HelpPanel } from '@/ui/game/HelpPanel.tsx';
import { PreMatchCard, type PreMatchIntro } from '@/ui/game/PreMatchCard.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { VERB_COLORS } from '../config.ts';
import { markControlsSeen } from './controlsSeen.ts';

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

const INTRO: PreMatchIntro = {
  title: 'Neon Dash',
  goal: 'Race to the finish. The barrier colour tells you: jump, duck or dodge.',
  keys: [
    ['A / D', 'Lanes'],
    ['W', 'Jump'],
    ['S', 'Slide'],
  ],
  touch: [
    ['Swipe ← →', 'Lanes'],
    ['Swipe ↑', 'Jump'],
    ['Swipe ↓', 'Slide'],
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
      playLabel="Start"
      onPlay={choose(onGo)}
      onTutorial={choose(onLearn)}
    />
  );
}

/** One tap away during a race. */
export function ControlsButton() {
  return (
    <HelpPanel>
      <Rows />
    </HelpPanel>
  );
}
