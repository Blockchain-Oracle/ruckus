import { PreMatchCard, type PreMatchIntro } from '@/ui/game/PreMatchCard.tsx';

import { useOnboarding } from '../tutorial/onboarding.ts';

const INTRO: PreMatchIntro = {
  title: 'Chickenz',
  goal: 'Last chicken standing wins the round. Grab a gun, or stomp them.',
  keys: [
    ['A / D', 'Run'],
    ['W', 'Jump'],
    ['Space', 'Shoot'],
  ],
  touch: [
    ['Stick', 'Run'],
    ['Stick ↑', 'Jump'],
    ['Red button', 'Shoot'],
  ],
};

/** First run: the shared pre-match card (ADR-010) in place of the old "new here?" modal. */
export function Onboarding({ onTutorial, onSkip }: { onTutorial(): void; onSkip(): void }) {
  const stage = useOnboarding((s) => s.stage);
  if (stage !== 'prompt') return null;
  return <PreMatchCard intro={INTRO} onPlay={onSkip} onTutorial={onTutorial} />;
}
