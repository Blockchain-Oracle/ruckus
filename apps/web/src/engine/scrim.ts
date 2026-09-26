import { create } from 'zustand';

import { SCRIM_HALF_MS } from './config.ts';

type ScrimState = { opaque: boolean };

export const useScrim = create<ScrimState>()(() => ({ opaque: false }));

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let chain: Promise<void> = Promise.resolve();

/**
 * Fade to the scrim, run `swap` while the screen is covered (then `settle`, if given, until the
 * new stage is ready), then fade back. Calls are serialised so
 * rapid carousel flicks queue instead of tearing the fade.
 */
export function crossfade(swap: () => void, settle?: () => Promise<void>): Promise<void> {
  chain = chain.then(async () => {
    useScrim.setState({ opaque: true });
    await wait(SCRIM_HALF_MS);
    // Armed before the swap: the new stage can report ready within the same commit.
    const settled = settle?.();
    swap();
    await settled;
    // Two frames lets React commit and the renderer draw the new scene before we reveal it.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    useScrim.setState({ opaque: false });
    await wait(SCRIM_HALF_MS);
  });
  return chain;
}
