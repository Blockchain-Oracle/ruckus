import { lazy, Suspense } from 'react';

import { CASINO_GAME_ID } from '@arena/shared';

const CasinoDebugPanel = lazy(() =>
  import('@/features/casino-debug/CasinoDebugPanel.tsx').then((m) => ({
    default: m.CasinoDebugPanel,
  })),
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
  return <main data-game-id={CASINO_GAME_ID}>RUCKUS</main>;
}
