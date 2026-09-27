import { CoinsIcon, PlayIcon, UsersThreeIcon } from '@phosphor-icons/react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import type { GameModes } from '@/engine/types.ts';
import { useT } from '@/i18n/index.ts';
import { Button } from '@/ui/Button.tsx';

/**
 * The three modes every game offers, in the same order and words (ADR-010): Play (you against
 * bots), Play with friends (the room lobby) and Bet, with the game's round as its subtitle.
 * Phones: Play spans the row, the other two share the row under it.
 */
export function ModeBar({ modes, betName }: { modes: GameModes; betName: string }) {
  const t = useT();
  const send = useGameMachine((s) => s.send);
  const { Extra, Options } = modes;
  return (
    <div className="pointer-events-auto mt-5 flex flex-col gap-3 compact:mt-4 [@media(max-height:480px)]:mt-3">
      {Options && <Options />}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-nowrap sm:gap-3 [@media(max-height:480px)]:flex [@media(max-height:480px)]:flex-nowrap">
        {Extra && (
          <div className="col-span-2 contents sm:contents">
            <Extra />
          </div>
        )}
        <Button
          variant="tomato"
          size="lg"
          sound="ui.confirm"
          onClick={() => send('entering')}
          className="col-span-2 h-14 text-xl sm:h-16 sm:px-8 sm:text-2xl [@media(max-height:480px)]:h-12 [@media(max-height:480px)]:px-6 [@media(max-height:480px)]:text-lg"
        >
          <PlayIcon weight="fill" /> {t('hub.play')}
        </Button>
        <Button
          variant="teal"
          size="lg"
          sound="ui.confirm"
          onClick={modes.friends}
          className="h-14 min-w-0 px-3 text-base leading-tight whitespace-normal sm:h-16 sm:px-6 sm:text-lg sm:whitespace-nowrap [@media(max-height:480px)]:h-12"
        >
          <UsersThreeIcon weight="bold" className="shrink-0 max-[380px]:hidden" />
          {t('mode.friends')}
        </Button>
        <Button
          variant="gold"
          size="lg"
          sound="ui.coin"
          onClick={modes.bet}
          className="h-14 min-w-0 flex-col gap-0.5 px-3 leading-none sm:h-16 sm:px-6 [@media(max-height:480px)]:h-12"
        >
          <span className="inline-flex items-center gap-1.5 text-base sm:text-xl">
            <CoinsIcon weight="bold" className="max-[380px]:hidden" /> {t('mode.bet')}
          </span>
          <span className="text-[11px] normal-case opacity-80 sm:text-xs">{betName}</span>
        </Button>
      </div>
    </div>
  );
}
