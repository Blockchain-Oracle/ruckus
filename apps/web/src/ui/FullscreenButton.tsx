import { ArrowsInIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils.ts';

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
};
const isFullscreen = () => document.fullscreenElement !== null;

/**
 * Chickenz's top-bar fullscreen toggle. Hidden where the page can't go fullscreen (iPhone Safari,
 * or a host iframe without `allow="fullscreen"`), rather than offering a dead button.
 */
export function FullscreenButton({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, isFullscreen, () => false);
  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null;
  const Icon = on ? ArrowsInIcon : ArrowsOutIcon;
  return (
    <button
      type="button"
      aria-label={on ? 'Exit fullscreen' : 'Fullscreen'}
      aria-pressed={on}
      onClick={(e) => {
        e.currentTarget.blur();
        if (on) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }}
      className={cn(
        'grid size-10 place-items-center rounded-full border-2 border-line bg-ink-2 text-cream hover:border-cream-dim',
        className,
      )}
    >
      <Icon weight="bold" className="size-5" />
    </button>
  );
}
