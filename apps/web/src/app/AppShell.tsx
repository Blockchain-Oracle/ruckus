import { ArrowLeftIcon, CaretDownIcon, GearSixIcon } from '@phosphor-icons/react';
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
import { FullscreenButton } from '@/ui/FullscreenButton.tsx';
import { Logo } from '@/ui/Logo.tsx';

import { ArenaLanding } from './ArenaLanding.tsx';
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
const GameSwitcherSheet = lazy(() =>
  import('@/ui/GameSwitcherSheet.tsx').then((mod) => ({ default: mod.GameSwitcherSheet })),
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
      className="relative z-20 flex items-center justify-between px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top),var(--hud-top))] transition-opacity duration-300 sm:px-8"
      style={{ opacity: hidden ? 0 : 1, visibility: hidden ? 'hidden' : 'visible' }}
    >
      <Logo className="text-3xl max-[380px]:text-2xl sm:text-4xl" />
      <div className="pointer-events-auto flex items-center gap-3 max-[380px]:gap-2">
        <BalancePill />
        <FullscreenButton className="hidden sm:grid" />
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
  const booting = useShell((s) => s.booting);
  const openSheet = useUi((s) => s.openSheet);
  // Mounted on first open and kept, so the sheet's close animation can play.
  const switcherOpened = useUi((s) => s.switcherEverOpened);

  const choose = (id: typeof gameId) => {
    writeUrlState({ game: id });
    void select(id);
  };

  // No game chosen: the arena landing, every cabinet with its footage (not while a deep link's
  // game is still loading: that would flash the landing before the game it asked for).
  if (!game && games.length > 1) return booting ? null : <ArenaLanding onChoose={choose} />;

  return (
    <m.main
      className="relative mt-auto flex flex-col gap-6 px-4 pb-[max(5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] compact:gap-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0, transition: ENTER }}
      exit={{ opacity: 0, y: 16, transition: EXIT }}
    >
      <section className="max-w-xl">
        {/* On a phone the title is the game switcher: one tap opens every cabinet in a sheet. */}
        <h1 className="font-display text-4xl leading-tight sm:text-5xl [@media(max-height:480px)]:text-3xl">
          {game && games.length > 1 ? (
            <button
              type="button"
              aria-label={`${game.title}: ${t('hub.switchGame')}`}
              onClick={() => openSheet('games')}
              className="pointer-events-auto inline-flex items-center gap-2 text-left"
            >
              {game.title}
              <span className="hidden size-9 place-items-center rounded-full border-2 border-line bg-ink-2 compact:grid [@media(max-height:480px)]:size-8">
                <CaretDownIcon weight="bold" className="size-5 [@media(max-height:480px)]:size-4" />
              </span>
            </button>
          ) : game ? (
            game.title
          ) : (
            t('hub.welcome.title')
          )}
        </h1>
        <p className="mt-2 max-w-sm text-lg text-cream-dim [text-shadow:0_2px_12px_rgb(0_0_0/0.8)] compact:text-base [@media(max-height:480px)]:hidden">
          {game ? t(game.taglineKey) : t('hub.welcome.body')}
        </p>
        {game && (
          <div className="pointer-events-auto mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 compact:mt-4 [@media(max-height:480px)]:mt-3 [@media(max-height:480px)]:flex-row [@media(max-height:480px)]:*:h-12 [@media(max-height:480px)]:*:text-lg">
            <Button
              variant="tomato"
              size="lg"
              sound="ui.confirm"
              onClick={() => send('entering')}
              className="max-sm:h-14 max-sm:w-full max-sm:text-xl"
            >
              {t('hub.play')}
            </Button>
            {/* Phones: the game's extras share one row under Play (3 → the first spans it). */}
            {HubActions && (
              <div className="contents compact:*:h-12 compact:*:px-5 compact:*:text-base max-sm:grid max-sm:grid-cols-2 max-sm:gap-3 max-sm:*:min-w-0 max-sm:*:px-3 max-sm:*:leading-tight max-sm:*:whitespace-normal max-[400px]:*:text-[13px] max-[400px]:*:tracking-normal max-[400px]:[&_svg]:hidden max-sm:[&>:first-child:nth-last-child(3)]:col-span-2 max-sm:[&>:only-child]:col-span-2">
                <HubActions />
              </div>
            )}
            {games.length > 1 && (
              <Button
                variant="ink"
                size="lg"
                sound="ui.back"
                onClick={() => choose(null)}
                className="compact:hidden"
              >
                {t('hub.back')}
              </Button>
            )}
          </div>
        )}
      </section>
      {/* A picker of one just repeats the headline; it earns its place with the second game. */}
      {games.length > 1 && (
        <nav
          aria-label={t('hub.pickGame')}
          className="pointer-events-auto -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 compact:hidden"
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
      {switcherOpened && (
        <Suspense fallback={null}>
          <GameSwitcherSheet onChoose={choose} />
        </Suspense>
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
