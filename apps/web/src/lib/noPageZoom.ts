/**
 * iOS WebKit (Safari and Chrome on iPhone alike) ignores `user-scalable=no`, and a pinch whose
 * fingers land on two different controls (thumb on the stick, thumb on Shoot) zooms the page
 * even though each control is `touch-action: none`. Once zoomed there is no way back mid-match,
 * so we cancel the gesture itself. `gesture*` events are WebKit-only; the multi-touch
 * `touchmove` guard covers browsers without them. Listeners must be non-passive to cancel.
 */
export function blockPageZoom() {
  const cancel = (e: Event) => e.preventDefault();
  const opts = { passive: false } as const;
  for (const type of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(type, cancel, opts);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    opts,
  );
  // `touch-action: manipulation` already stops double-tap zoom; this is the old-iOS backstop.
  document.addEventListener('dblclick', cancel, opts);
}
