import { lazy, Suspense, useEffect, useState } from 'react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { Scrim } from '@/engine/Scrim.tsx';
import { findGame } from '@/games/registry.ts';
import { getAudio } from '@/lib/audio/index.ts';

import { AppShell } from './AppShell.tsx';
import { readUrlState } from './urlState.ts';

/** three.js + R3F are the heaviest thing on the page; they load after the DOM hub has painted. */
const GameShell = lazy(() => import('@/engine/GameShell.tsx'));
const Toaster = lazy(() =>
  import('@/ui/primitives/sonner.tsx').then((m) => ({ default: m.Toaster })),
);
const CANVAS_FADE_MS = 600;

export function Hub() {
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    // Build the graph and fetch UI sounds now; the context itself unlocks on the first gesture.
    getAudio();
    const deepLinked = findGame(readUrlState().game);
    if (deepLinked) void useGameMachine.getState().select(deepLinked.id);
  }, []);

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ opacity: canvasReady ? 1 : 0, transition: `opacity ${CANVAS_FADE_MS}ms ease-out` }}
      >
        <Suspense fallback={null}>
          <GameShell onReady={() => setCanvasReady(true)} />
        </Suspense>
      </div>
      <Scrim />
      <AppShell />
      <Suspense fallback={null}>
        <Toaster position="top-center" />
      </Suspense>
    </>
  );
}
