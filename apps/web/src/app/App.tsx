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

/** Dev only: behind the DEV constant so production builds drop the chunk and its GLB entirely. */
const ChickenLab = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/chicken-lab/ChickenLab.tsx').then((m) => ({ default: m.ChickenLab })),
    )
  : null;
const PortraitStudio = import.meta.env.DEV
  ? lazy(() =>
      import('@/features/chicken-lab/PortraitStudio.tsx').then((m) => ({
        default: m.PortraitStudio,
      })),
    )
  : null;

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
  if (ChickenLab && debug === 'chicken') {
    return (
      <Suspense fallback={null}>
        <ChickenLab />
      </Suspense>
    );
  }
  if (PortraitStudio && debug === 'portrait') {
    return (
      <Suspense fallback={null}>
        <PortraitStudio />
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
