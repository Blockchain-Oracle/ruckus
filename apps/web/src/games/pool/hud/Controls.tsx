import { useState } from 'react';

import { isCompact } from '@/lib/platform.ts';
import { HelpPanel } from '@/ui/game/HelpPanel.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

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
  // Play's first run gets the shared pre-match card, so the full card waits behind "?". The bet
  // round has no pre-match card: its steps open once, except on phones where the panel says it all.
  const [firstOpen] = useState(() => {
    if (!wager || isCompact()) return false;
    try {
      return window.localStorage.getItem('ruckus.pool.controlsSeen') !== '1';
    } catch {
      return true;
    }
  });
  const markSeen = () => {
    try {
      window.localStorage.setItem('ruckus.pool.controlsSeen', '1');
    } catch {
      /* shown again next visit */
    }
  };
  const rows = coarse ? TOUCH : MOUSE;
  return (
    <HelpPanel
      title={wager ? 'CALL YOUR SHOT' : 'HOW TO PLAY'}
      defaultOpen={firstOpen}
      onClose={markSeen}
      buttonClassName="absolute top-16 left-3 sm:top-[4.5rem] sm:left-8"
      panelClassName="absolute top-16 left-3 max-h-[calc(100%-5rem)] w-[min(22rem,calc(100%-7rem))] bg-ink/92 sm:top-[4.5rem] sm:left-8"
    >
      {(close) => (
        <>
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
        </>
      )}
    </HelpPanel>
  );
}
