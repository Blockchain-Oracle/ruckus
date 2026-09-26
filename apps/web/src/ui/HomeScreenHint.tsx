import { ArrowsOutIcon, ExportIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils.ts';

import { BUTTON } from './FullscreenButton.tsx';

/**
 * iPhone stand-in for the fullscreen toggle: explains Add to Home Screen, the one route there.
 * The card portals to <body> and centres in the viewport, so a HUD corner (or a 342 px tall
 * landscape phone) can never clip it.
 */
export function HomeScreenHint({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!card.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Play full screen"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(BUTTON, className)}
      >
        <ArrowsOutIcon weight="bold" className="size-5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={card}
            role="dialog"
            aria-label="Full screen on iPhone"
            className="fixed top-1/2 left-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[min(17rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border-2 border-line bg-ink-2 p-3.5 text-left text-sm leading-snug text-cream-dim shadow-[0_18px_50px_rgb(0_0_0/0.6)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-base text-cream">Full screen on iPhone</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-cream-dim hover:text-cream"
              >
                <XIcon weight="bold" className="size-4" />
              </button>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-cream">
              <ExportIcon weight="bold" className="size-4 shrink-0" /> Share → Add to Home Screen
            </p>
            <p className="mt-1 text-xs">
              Then open RUCKUS from your Home Screen: no browser bars. iPhone browsers can't do it
              from a page.
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
