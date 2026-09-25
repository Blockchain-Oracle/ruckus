import { useSyncExternalStore } from 'react';

import type { BridgeState, CasinoBridge } from '@arena/casino-bridge';

const CONNECTING: BridgeState = { mode: 'connecting', api: null, snapshot: null, demo: null };

let bridge: CasinoBridge | null = null;
const waiting = new Set<() => void>();

/**
 * The SDK (penpal, zod, viem) is ~100 KB gz, so it's a separate chunk fetched at boot rather than
 * part of first paint. Until it arrives the state is simply "connecting", which the UI already
 * handles; the 3 s host handshake timeout starts only once the bridge module runs.
 */
export function startCasinoBridge(): Promise<CasinoBridge> {
  return Promise.all([import('@arena/casino-bridge'), import('./manifest.ts')]).then(
    ([{ getCasinoBridge }, { GAME_MANIFEST }]) => {
      bridge = getCasinoBridge(GAME_MANIFEST);
      for (const notify of waiting) notify();
      return bridge;
    },
  );
}

const subscribe = (onChange: () => void) => {
  if (bridge) return bridge.subscribe(onChange);
  let unsubscribe: (() => void) | null = null;
  const attach = () => {
    waiting.delete(attach);
    unsubscribe = bridge?.subscribe(onChange) ?? null;
  };
  waiting.add(attach);
  return () => {
    waiting.delete(attach);
    unsubscribe?.();
  };
};

/** Current casino bridge state (host or demo); re-renders on every host snapshot. */
export function useCasinoBridge(): BridgeState {
  return useSyncExternalStore(subscribe, () => bridge?.getState() ?? CONNECTING);
}
