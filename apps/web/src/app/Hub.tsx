import { lazy, Suspense, useEffect, useState } from 'react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { Scrim } from '@/engine/Scrim.tsx';
import { findGame } from '@/games/registry.ts';
import { Toaster } from '@/ui/primitives/sonner.tsx';

import { AppShell } from './AppShell.tsx';
import { readUrlState } from './urlState.ts';

/** three.js + R3F are the heaviest thing on the page; they load after the DOM hub has painted. */
const GameShell = lazy(() => import('@/engine/GameShell.tsx'));
const CANVAS_FADE_MS = 600;

export function Hub() {
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
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
      <Toaster position="top-center" />
    </>
  );
}
