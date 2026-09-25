import { useSyncExternalStore } from 'react';

import { type BridgeState, getCasinoBridge } from '@arena/casino-bridge';

import { GAME_MANIFEST } from './manifest.ts';

const bridge = () => getCasinoBridge(GAME_MANIFEST);

/** Current casino bridge state (host or demo) — re-renders on every host snapshot. */
export function useCasinoBridge(): BridgeState {
  return useSyncExternalStore(
    (onChange) => bridge().subscribe(onChange),
    () => bridge().getState(),
  );
}
