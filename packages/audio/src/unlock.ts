const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Browsers (and sandboxed iframes above all) start AudioContexts suspended until a user gesture.
 * iOS additionally needs a real buffer played inside the gesture, and mutes Web Audio under the
 * ringer switch unless the audio session is "playback".
 */
export function installUnlock(ctx: AudioContext, onUnlocked: () => void): () => void {
  const nav = navigator as AudioSessionNavigator;
  if (nav.audioSession) nav.audioSession.type = 'playback';

  const unlock = () => {
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    blip.connect(ctx.destination);
    blip.start();
    void ctx.resume().then(() => {
      if (ctx.state !== 'running') return;
      for (const g of GESTURES) window.removeEventListener(g, unlock, true);
      onUnlocked();
    });
  };
  // iOS suspends the context when the tab is backgrounded; resume on return.
  const onVisible = () => {
    if (document.visibilityState === 'visible' && ctx.state !== 'running') void ctx.resume();
  };

  for (const g of GESTURES) window.addEventListener(g, unlock, true);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    for (const g of GESTURES) window.removeEventListener(g, unlock, true);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
