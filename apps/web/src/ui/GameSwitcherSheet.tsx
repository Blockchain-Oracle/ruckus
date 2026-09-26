import { SquaresFourIcon, UsersThreeIcon } from '@phosphor-icons/react';

import { useUi } from '@/app/stores/ui.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { loadGame } from '@/games/loader.ts';
import { type GAMES, visibleGames } from '@/games/registry.ts';
import { useT } from '@/i18n/index.ts';
import { uiSound } from '@/lib/audio/index.ts';
import { cn } from '@/lib/utils.ts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/primitives/sheet.tsx';

type GameId = (typeof GAMES)[number]['id'] | null;

/**
 * The phone's game picker: a bottom sheet in thumb reach instead of a sideways cabinet strip
 * under a stack of buttons. Posters only (no video) so opening it costs nothing.
 */
export function GameSwitcherSheet({ onChoose }: { onChoose: (id: GameId) => void }) {
  const t = useT();
  const open = useUi((s) => s.sheet === 'games');
  const openSheet = useUi((s) => s.openSheet);
  const current = useGameMachine((s) => s.gameId);
  const pick = (id: GameId) => {
    uiSound('ui.confirm');
    openSheet(null);
    if (id !== current) onChoose(id);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => openSheet(o ? 'games' : null)}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-card)] border-line bg-ink-2 pb-[max(5rem,env(safe-area-inset-bottom))] text-cream"
      >
        {/* "All games" lives up here: the jam's corner badge covers the bottom of the sheet. */}
        <SheetHeader className="flex-row items-center gap-3 pr-12 pb-0">
          <SheetTitle className="font-display text-2xl text-cream max-[380px]:text-xl">
            {t('hub.switchGame')}
          </SheetTitle>
          <button
            type="button"
            onClick={() => pick(null)}
            className="font-display label-caps ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-line px-3 text-xs text-cream-dim hover:text-cream"
          >
            <SquaresFourIcon weight="bold" className="size-4" /> {t('hub.allGames')}
          </button>
        </SheetHeader>
        <ul className="grid grid-cols-1 gap-2 px-4 min-[520px]:grid-cols-2">
          {visibleGames().map((g) => (
            <li key={g.id}>
              <button
                type="button"
                aria-current={g.id === current}
                onClick={() => pick(g.id)}
                onPointerEnter={() => void loadGame(g.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[var(--radius-card)] border-2 bg-ink-3 p-2 text-left',
                  g.id === current ? 'border-tomato' : 'border-line',
                )}
              >
                <img
                  src={g.preview.poster}
                  alt=""
                  className="aspect-video w-24 shrink-0 rounded-md object-cover"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-lg text-cream">{g.title}</span>
                  <span className="font-pixel label-caps inline-flex items-center gap-1.5 text-xs text-teal">
                    <UsersThreeIcon weight="bold" className="size-3.5" />
                    {g.players} {t('hub.players')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
