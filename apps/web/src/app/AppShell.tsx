import { ArrowLeftIcon, GearSixIcon } from '@phosphor-icons/react';
import { AnimatePresence, LazyMotion, m } from 'motion/react';
import { lazy, Suspense } from 'react';

import { writeUrlState } from '@/app/urlState.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { getLoadedGame, loadGame } from '@/games/loader.ts';
import { findGame, visibleGames } from '@/games/registry.ts';
import { useT } from '@/i18n/index.ts';
import { BalancePill } from '@/ui/BalancePill.tsx';
import { Button } from '@/ui/Button.tsx';
import { CabinetTile } from '@/ui/CabinetTile.tsx';
import { Logo } from '@/ui/Logo.tsx';

import { useShell } from './stores/shell.ts';
import { useUi } from './stores/ui.ts';

/** Entrances ease out and are slower than exits (research §1.2). */
const ENTER = { duration: 0.3, ease: [0.22, 1, 0.36, 1] } as const;
const EXIT = { duration: 0.16, ease: [0.55, 0, 1, 0.45] } as const;
const STAGGER_S = 0.045;
const PLAY_VIGNETTE_OPACITY = 0.25;

/** Animation features and the settings sheet (Radix) stay out of the first-paint chunk. */
const loadMotionFeatures = () => import('./motionFeatures.ts').then((mod) => mod.default);
const SettingsSheet = lazy(() =>
  import('@/ui/SettingsSheet.tsx').then((mod) => ({ default: mod.SettingsSheet })),
);

/**
 * The DOM layer over the canvas. The root ignores pointer events so the game behind it stays live;
 * only real controls opt back in. A vignette frames the scene instead of glass panels.
 */
export function AppShell() {
  const phase = useGameMachine((s) => s.phase);
  const showMenu = phase === 'attract';
  const inGame = phase === 'play' || phase === 'entering';
  // Mounted on first open and kept, so the sheet's close animation can play.
  const sheetOpen = useUi((s) => s.sheetEverOpened);
  const gameOwnsHud = useShell((s) => s.gameOwnsHud);
  const immersive = useShell((s) => s.immersive);
  const gameId = useGameMachine((s) => s.gameId);
  const GameOverlay = getLoadedGame(gameId)?.Overlay;

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col">
        {/* The vignette frames menus; in play it steps back so the arena edges stay readable. */}
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700"
          style={{ background: 'var(--vignette)', opacity: inGame ? PLAY_VIGNETTE_OPACITY : 1 }}
        />
        <TopBar hidden={immersive} />
        <AnimatePresence mode="wait">
          {showMenu && <HubMenu key="menu" />}
          {inGame && !gameOwnsHud && <PlayHud key="hud" />}
        </AnimatePresence>
        {GameOverlay && <GameOverlay />}
        {sheetOpen && (
          <Suspense fallback={null}>
            <SettingsSheet />
          </Suspense>
        )}
      </div>
    </LazyMotion>
  );
}

function TopBar({ hidden }: { hidden: boolean }) {
  const openSheet = useUi((s) => s.openSheet);
  return (
    <header
      aria-hidden={hidden}
      className="relative flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] transition-opacity duration-300 sm:px-8"
      style={{ opacity: hidden ? 0 : 1, visibility: hidden ? 'hidden' : 'visible' }}
    >
      <Logo className="text-3xl sm:text-4xl" />
      <div className="pointer-events-auto flex items-center gap-3">
        <BalancePill />
        <button
          type="button"
          aria-label="Settings"
          onClick={() => openSheet('settings')}
          className="grid size-10 place-items-center rounded-full border-2 border-line bg-ink-2 text-cream hover:border-cream-dim"
        >
          <GearSixIcon weight="bold" className="size-5" />
        </button>
      </div>
    </header>
  );
}

function HubMenu() {
  const t = useT();
  const gameId = useGameMachine((s) => s.gameId);
  const select = useGameMachine((s) => s.select);
  const send = useGameMachine((s) => s.send);
  const games = visibleGames();
  const game = findGame(gameId);
  const HubActions = getLoadedGame(gameId)?.HubActions;

  const choose = (id: typeof gameId) => {
    writeUrlState({ game: id });
    void select(id);
  };

  return (
    <m.main
      className="relative mt-auto flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: ENTER }}
      exit={{ opacity: 0, y: 16, transition: EXIT }}
    >
      <section className="max-w-xl">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {game ? game.title : t('hub.welcome.title')}
        </h1>
        <p className="mt-2 text-lg text-cream-dim">
          {game ? t(game.taglineKey) : t('hub.welcome.body')}
        </p>
        {game && (
          <div className="pointer-events-auto mt-5 flex gap-4">
            <Button variant="tomato" size="lg" sound="ui.confirm" onClick={() => send('entering')}>
              {t('hub.play')}
            </Button>
            {HubActions && <HubActions />}
            <Button variant="ink" size="lg" sound="ui.back" onClick={() => choose(null)}>
              {t('hub.back')}
            </Button>
          </div>
        )}
      </section>
      {games.length > 0 && (
        <nav
          aria-label={t('hub.pickGame')}
          className="pointer-events-auto -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        >
          {games.map((g, i) => (
            <m.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { ...ENTER, delay: i * STAGGER_S } }}
            >
              <CabinetTile
                title={g.title}
                tagline={t(g.taglineKey)}
                players={`${g.players} ${t('hub.players')}`}
                active={g.id === gameId}
                onSelect={() => choose(g.id)}
                onIntent={() => void loadGame(g.id)}
              />
            </m.div>
          ))}
        </nav>
      )}
    </m.main>
  );
}

/** Placeholder until each game ships its own HUD: just a way back to the hub. */
function PlayHud() {
  const t = useT();
  const send = useGameMachine((s) => s.send);
  return (
    <m.div
      className="pointer-events-auto absolute bottom-6 left-4 sm:left-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: ENTER }}
      exit={{ opacity: 0, transition: EXIT }}
    >
      <Button variant="ink" size="sm" sound="ui.back" onClick={() => send('leaving')}>
        <ArrowLeftIcon weight="bold" /> {t('hub.back')}
      </Button>
    </m.div>
  );
}
