import { STAGE_WARM_MAX_MS } from './config.ts';

let release: (() => void) | null = null;

/**
 * Resolves once the next scene has mounted (assets loaded) and its shaders are compiled, or after
 * STAGE_WARM_MAX_MS, whichever comes first: the scrim stays up through that, so a phone never
 * shows the stutter of first-use shader compiles, and a slow device never hangs on the fade.
 */
export function awaitStageWarm(): Promise<void> {
  release?.();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      if (release === done) release = null;
      resolve();
    };
    const timer = setTimeout(done, STAGE_WARM_MAX_MS);
    release = done;
  });
}

/** Called by the canvas when the new stage is ready to be seen. */
export function stageWarmed() {
  release?.();
}
