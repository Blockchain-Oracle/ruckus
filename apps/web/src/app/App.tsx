import { lazy, Suspense } from 'react';

import { Hub } from './Hub.tsx';

const CasinoDebugPanel = lazy(() =>
  import('@/features/casino-debug/CasinoDebugPanel.tsx').then((m) => ({
    default: m.CasinoDebugPanel,
  })),
);

const ConnectivityPanel = lazy(() =>
  import('@/features/connectivity-debug/ConnectivityPanel.tsx').then((m) => ({
    default: m.ConnectivityPanel,
  })),
);

const ChickenLab = lazy(() =>
  import('@/features/chicken-lab/ChickenLab.tsx').then((m) => ({ default: m.ChickenLab })),
);

const DEBUG_PARAM = 'debug';

export function App() {
  const debug = new URLSearchParams(window.location.search).get(DEBUG_PARAM);
  if (debug === 'casino') {
    return (
      <Suspense fallback={null}>
        <CasinoDebugPanel />
      </Suspense>
    );
  }
  if (import.meta.env.DEV && debug === 'chicken') {
    return (
      <Suspense fallback={null}>
        <ChickenLab />
      </Suspense>
    );
  }
  if (debug === 'connectivity') {
    return (
      <Suspense fallback={null}>
        <ConnectivityPanel />
      </Suspense>
    );
  }
  return <Hub />;
}
