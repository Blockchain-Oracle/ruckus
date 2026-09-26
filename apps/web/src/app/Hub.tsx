import { lazy, Suspense, useEffect, useState } from 'react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { Scrim } from '@/engine/Scrim.tsx';
import { findGame, visibleGames } from '@/games/registry.ts';
import { getAudio } from '@/lib/audio/index.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { AppShell } from './AppShell.tsx';
import { useShell } from './stores/shell.ts';
import { readUrlState } from './urlState.ts';

/** three.js + R3F are the heaviest thing on the page; they load after the DOM hub has painted. */
const GameShell = lazy(() => import('@/engine/GameShell.tsx'));
const Toaster = lazy(() =>
  import('@/ui/primitives/sonner.tsx').then((m) => ({ default: m.Toaster })),
);
const CANVAS_FADE_MS = 600;

// A deep link hides the landing from the very first paint until its game has landed (effects run
// twice under StrictMode, so this can't hang on a select() promise).
if (findGame(readUrlState().game)) {
  useShell.setState({ booting: true });
  const unsubscribe = useGameMachine.subscribe((s) => {
    if (!s.gameId) return;
    useShell.setState({ booting: false });
    unsubscribe();
  });
}

export function Hub() {
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    // Build the graph and fetch UI sounds now; the context itself unlocks on the first gesture.
    getAudio();
    // Music waits for the first gesture: browsers block audio before it, and it saves 1 MB on load.
    const startMusic = () => playMusic(LOBBY_TRACK);
    window.addEventListener('pointerdown', startMusic, { once: true });
    window.addEventListener('keydown', startMusic, { once: true });
    // A deep link opens that game's live attract; otherwise the arena landing shows every game.
    // (With only one game shipped there is no landing: open on it, ADR-007.)
    const games = visibleGames();
    const opening = findGame(readUrlState().game) ?? (games.length > 1 ? null : games[0]);
    if (opening)
      void useGameMachine
        .getState()
        .select(opening.id)
        .catch(() => useShell.setState({ booting: false }));
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
