import { ArrowClockwiseIcon, CheckCircleIcon, WifiSlashIcon } from '@phosphor-icons/react';

import { useConnection } from './resilience.ts';

/**
 * The room connection, said out loud: "Reconnecting…" while the seat is held, "Back in the room"
 * when it returns, and a Rejoin button if it's lost. Sits above every game's HUD.
 */
export function ConnectionBanner() {
  const { state, retry } = useConnection();
  if (state === 'ok') return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,var(--hud-top))] z-40 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-line bg-ink-2/95 py-1.5 pr-2 pl-3 text-sm text-cream shadow-[0_10px_30px_rgb(0_0_0/0.5)]">
        {state === 'reconnecting' && (
          <>
            <WifiSlashIcon weight="bold" className="size-4 animate-pulse text-warn" />
            Reconnecting… your seat is held
          </>
        )}
        {state === 'back' && (
          <>
            <CheckCircleIcon weight="fill" className="size-4 text-teal" />
            Back in the room
          </>
        )}
        {state === 'lost' && (
          <>
            <WifiSlashIcon weight="bold" className="size-4 text-tomato" />
            Lost connection
            {retry && (
              <button
                type="button"
                onClick={retry}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-tomato px-2.5 py-0.5 font-display text-xs text-cream"
              >
                <ArrowClockwiseIcon weight="bold" /> Rejoin
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
