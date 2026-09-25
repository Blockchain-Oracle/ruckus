import { Button } from '@/ui/Button.tsx';

import { useTutorial } from '../tutorial/director.ts';
import { STEPS } from '../tutorial/steps.ts';
import { useCoarsePointer } from './TouchControls.tsx';

/** Chickenz's step box: 60 px from the top, 2 px #ffee58 border, Silkscreen text. */
export function TutorialHud({ onSkip }: { onSkip: () => void }) {
  const step = useTutorial((s) => s.step);
  const coarse = useCoarsePointer();
  const current = STEPS[step];
  if (!current) return null;
  return (
    <div className="pointer-events-none absolute inset-0 font-pixel">
      <div className="absolute inset-x-0 top-[60px] flex justify-center px-4">
        <div className="max-w-md rounded-sm border-2 border-[#ffee58] bg-black/80 px-5 py-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-[#ffee58]">
            Step {step + 1} / {STEPS.length}
          </div>
          <div className="mt-1 whitespace-pre-line text-sm text-white">
            {coarse ? current.touch : current.text}
          </div>
        </div>
      </div>
      <div className="pointer-events-auto absolute top-3 right-4">
        <Button size="sm" sound="ui.back" onClick={onSkip}>
          Skip tutorial
        </Button>
      </div>
    </div>
  );
}
