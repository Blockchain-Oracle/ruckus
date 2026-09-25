import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { useCoarse } from './useCoarse.ts';

const MOUSE = [
  ['Aim', 'Click or drag on the table. Your line stays put until you click the table again.'],
  ['Fine aim', '← / → keys (hold Shift for tiny steps).'],
  ['Power', 'Drag the cue on the right down, or hold Space. The longer, the harder.'],
  ['Shoot', 'Let go of the cue (or release Space).'],
  ['Spin', 'Drag the red dot on the white ball, bottom left. Low = draw back, high = follow.'],
  ['Camera', 'V or the View button swaps the overview and the view down the cue.'],
] as const;
const TOUCH = [
  ['Aim', 'Tap or drag on the table. Your line stays put until you touch the table again.'],
  ['Power', 'Pull the cue on the right down. The further, the harder.'],
  ['Shoot', 'Let go of the cue.'],
  ['Spin', 'Drag the red dot on the white ball, bottom left. Low = draw back, high = follow.'],
  ['Camera', 'The View button swaps the overview and the view down the cue.'],
] as const;
const WAGER_STEPS = [
  'Aim at a ball and a pocket (click or drag on the table). The bar shows the call and its odds.',
  'Set the pace with the cue on the right (or Space). It stays where you leave it.',
  'Press Call it. The chain decides make or miss, then your stroke plays.',
] as const;

/** How to play, on the table: open by default the first time, then one tap away. */
export function ControlsCard({ wager = false }: { wager?: boolean }) {
  const coarse = useCoarse();
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem('ruckus.pool.controlsSeen') !== '1';
    } catch {
      return true;
    }
  });
  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem('ruckus.pool.controlsSeen', '1');
    } catch {
      /* shown again next visit */
    }
  };
  if (!open) {
    return (
      <button
        type="button"
        aria-label="How to play"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute top-16 left-3 grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim sm:top-[4.5rem] sm:left-8"
      >
        <QuestionIcon weight="bold" className="size-5" />
      </button>
    );
  }
  const rows = coarse ? TOUCH : MOUSE;
  return (
    <div className="pointer-events-auto absolute top-16 left-3 w-[min(22rem,calc(100%-7rem))] rounded-2xl border-2 border-teal bg-ink/92 p-4 text-sm shadow-[0_12px_40px_rgb(0_0_0/0.5)] sm:top-[4.5rem] sm:left-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-teal">{wager ? 'CALL YOUR SHOT' : 'HOW TO PLAY'}</span>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="text-cream-dim hover:text-cream"
        >
          <XIcon weight="bold" className="size-4" />
        </button>
      </div>
      {wager ? (
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-cream">
          {WAGER_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-display text-xs text-gold">{k}</dt>
              <dd className="text-cream">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        type="button"
        onClick={close}
        className="mt-3 w-full rounded-lg bg-teal py-1.5 font-display text-ink"
      >
        GOT IT
      </button>
    </div>
  );
}
