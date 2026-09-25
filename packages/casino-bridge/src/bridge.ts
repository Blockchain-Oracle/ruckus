import type { CasinoGameManifestV1 } from '@chain/casino-sdk';
import {
  connectGameToHost,
  type GuestBridgeConnection,
  type HostApiV1,
  type HostSnapshotV1,
} from '@chain/casino-sdk/guest';

import { HOST_HANDSHAKE_TIMEOUT_MS } from './constants.ts';
import { DemoHost } from './demo-host.ts';

export type BridgeMode = 'connecting' | 'host' | 'demo';

export type BridgeState = {
  mode: BridgeMode;
  api: HostApiV1 | null;
  snapshot: HostSnapshotV1 | null;
  /** Present only in demo mode (e.g. to offer a balance reset). */
  demo: DemoHost | null;
};

type Listener = (state: BridgeState) => void;

export type CasinoBridge = {
  getState(): BridgeState;
  subscribe(listener: Listener): () => void;
};

let singleton: CasinoBridge | undefined;

/**
 * One bridge per page: the chain.wtf host binds its guest proxy to the *first* handshake, so a second
 * connect (React StrictMode remounts, HMR) would leave the host pushing into a dead connection.
 *
 * Mode selection:
 * - top-level window → DemoHost immediately (standalone URL; judges and the jam gallery open it directly)
 * - framed → Penpal handshake; if the host doesn't answer within HOST_HANDSHAKE_TIMEOUT_MS
 *   (e.g. the jam gallery's hover iframe, which has no casino host) → DemoHost
 */
export function getCasinoBridge(manifest: CasinoGameManifestV1): CasinoBridge {
  if (singleton) return singleton;

  const listeners = new Set<Listener>();
  let state: BridgeState = { mode: 'connecting', api: null, snapshot: null, demo: null };
  const update = (patch: Partial<BridgeState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  };

  const startDemo = () => {
    const demo = new DemoHost({ manifest });
    update({ mode: 'demo', api: demo, demo, snapshot: demo.snapshot() });
    demo.subscribe((snapshot) => update({ snapshot }));
  };

  const isFramed = typeof window !== 'undefined' && window.parent !== window;
  if (!isFramed) {
    startDemo();
  } else {
    let connection: GuestBridgeConnection | undefined;
    const timeout = setTimeout(() => {
      if (state.mode !== 'connecting') return;
      connection?.destroy();
      startDemo();
    }, HOST_HANDSHAKE_TIMEOUT_MS);
    connection = connectGameToHost({
      async setState(snapshot) {
        if (state.mode !== 'demo') update({ snapshot });
      },
    });
    void connection.promise
      .then((api) => {
        if (state.mode !== 'connecting') return; // lost the race to the demo fallback
        clearTimeout(timeout);
        update({ mode: 'host', api });
      })
      .catch(() => {
        /* the timeout falls back to demo */
      });
  }

  singleton = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
  return singleton;
}
