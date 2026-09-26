/** iPadOS reports itself as a Mac; the touch points give it away. */
export const isIos = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

export const launchedFromHomeScreen = () =>
  window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

/**
 * iOS browsers (Safari and Chrome, both WebKit) with their bars: in landscape, the first tap near
 * the top edge only brings the toolbar back, so a top-corner button needs two taps. CSS reads this
 * flag to lower the game HUDs (`hud-frame`). A home-screen launch has no bars, so no flag.
 */
export function flagIosBrowserBars() {
  if (isIos() && !launchedFromHomeScreen()) document.documentElement.dataset.iosBars = '';
}

/** Mirrors the `compact:` CSS variant (styles/global.css): a phone either way up. */
export const COMPACT_QUERY = '(max-width: 639.98px), (max-height: 480px)';
export const isCompact = () => window.matchMedia(COMPACT_QUERY).matches;
