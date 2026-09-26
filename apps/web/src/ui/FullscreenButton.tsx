import { ArrowsInIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils.ts';

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
};
const isFullscreen = () => document.fullscreenElement !== null;

/** iPadOS reports itself as a Mac; the touch points give it away. */
const isIos = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

const launchedFromHomeScreen = () =>
  window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

/**
 * iPhone browsers (Safari and Chrome alike, both WebKit) have no page fullscreen, so there the
 * button explains the one route that works: Add to Home Screen. Not inside a host iframe, where
 * that would install the host instead.
 */
const offersHomeScreen = () => isIos() && window.parent === window && !launchedFromHomeScreen();

/** Only iPhones ever see it, so it stays out of everyone else's first paint. */
const HomeScreenHint = lazy(() =>
  import('./HomeScreenHint.tsx').then((m) => ({ default: m.HomeScreenHint })),
);

export const BUTTON =
  'grid size-10 place-items-center rounded-full border-2 border-line bg-ink-2 text-cream hover:border-cream-dim';

/**
 * Chickenz's top-bar fullscreen toggle. Hidden where the page can't go fullscreen and there's
 * nothing useful to say (a host iframe without `allow="fullscreen"`), rather than a dead button.
 */
export function FullscreenButton({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, isFullscreen, () => false);
  if (typeof document === 'undefined') return null;
  if (!document.fullscreenEnabled)
    return offersHomeScreen() ? (
      <Suspense fallback={null}>
        <HomeScreenHint className={className} />
      </Suspense>
    ) : null;
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
      className={cn(BUTTON, className)}
    >
      <Icon weight="bold" className="size-5" />
    </button>
  );
}
