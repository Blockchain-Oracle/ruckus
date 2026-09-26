import { ArrowsOutIcon, ExportIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils.ts';

import { BUTTON } from './FullscreenButton.tsx';

/** iPhone stand-in for the fullscreen toggle: explains Add to Home Screen, the one route there. */
export function HomeScreenHint({ className }: { className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="Play full screen"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(BUTTON, className)}
      >
        <ArrowsOutIcon weight="bold" className="size-5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Play full screen"
          className="absolute top-12 right-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border-2 border-line bg-ink-2 p-4 text-left text-sm leading-snug text-cream-dim shadow-[0_18px_50px_rgb(0_0_0/0.6)]"
        >
          <p className="font-display text-lg text-cream">Full screen on iPhone</p>
          <p className="mt-1.5">
            iPhone browsers can't hide their bars for a web page. Add RUCKUS to your Home Screen and
            it opens full screen:
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-cream">
            <ExportIcon weight="bold" className="size-4 shrink-0" /> Share → Add to Home Screen
          </p>
          <p className="mt-1 text-xs">In Chrome, Share is at the top right of the address bar.</p>
        </div>
      )}
    </div>
  );
}
