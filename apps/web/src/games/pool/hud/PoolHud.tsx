import { ArrowLeftIcon, CameraIcon, GearSixIcon } from '@phosphor-icons/react';
import { useShallow } from 'zustand/react/shallow';

import { useUi } from '@/app/stores/ui.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import { FullscreenButton } from '@/ui/FullscreenButton.tsx';

import { aim } from '../match/aim.ts';
import { usePool } from '../match/store.ts';
import { BallChip } from './BallChip.tsx';
import { PowerCue } from './PowerCue.tsx';
import { SpinBall } from './SpinBall.tsx';

const SOLIDS = [1, 2, 3, 4, 5, 6, 7];
const STRIPES = [9, 10, 11, 12, 13, 14, 15];

function PlayerCard({ seat }: { seat: 0 | 1 }) {
  const { names, bots, shooter, groups, left, thinking, status, pottedSet } = usePool(
    useShallow((s) => ({
      names: s.names,
      bots: s.bots,
      shooter: s.shooter,
      groups: s.groups,
      left: s.left,
      thinking: s.thinking,
      status: s.status,
      pottedSet: s.potted,
    })),
  );
  const g = groups[seat];
  const turn = shooter === seat && status === 'playing';
  const balls = g === 'solids' ? SOLIDS : g === 'stripes' ? STRIPES : [];
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border-2 bg-ink/85 px-3 py-2 transition-colors sm:max-w-72',
        turn ? 'border-teal shadow-[0_0_24px_rgb(46_196_182/0.35)]' : 'border-line',
        seat === 1 && 'items-end text-right',
      )}
    >
      <div className={cn('flex w-full items-center gap-2', seat === 1 && 'flex-row-reverse')}>
        <span className="truncate font-display text-sm text-cream sm:text-base">{names[seat]}</span>
        {turn && (
          <span className="shrink-0 rounded-full bg-teal px-2 py-0.5 font-display text-[10px] text-ink">
            {bots[seat] && thinking ? 'THINKING' : 'TO SHOOT'}
          </span>
        )}
      </div>
      <div className={cn('flex gap-0.5', seat === 1 && 'flex-row-reverse')}>
        {balls.length > 0 ? (
          balls.map((n) => (
            <BallChip key={n} n={n} gone={pottedSet.includes(n)} className="size-4 sm:size-5" />
          ))
        ) : (
          <span className="text-[11px] text-cream-dim">
            {left[seat] === null ? 'Open table' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

/** Pool's in-match HUD: players, messages, the power cue, spin, and the view and leave buttons. */
export function PoolHud({ onLeave }: { onLeave: () => void }) {
  const {
    status,
    message,
    ballInHand,
    mustCall,
    calledPocket,
    rolling,
    myTurn: mine,
    mySlot,
  } = usePool();
  if (status === 'off') return null;
  const myTurn = status === 'playing' && mine && !rolling;
  const watching = mySlot < 0;
  const hint = !myTurn
    ? null
    : mustCall && calledPocket < 0
      ? 'Call a pocket for the 8 (tap it)'
      : ballInHand === 'kitchen'
        ? 'Break: drag the cue ball behind the line'
        : ballInHand === 'anywhere'
          ? 'Ball in hand: drag the cue ball anywhere'
          : null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-3 flex items-start gap-3 px-16 sm:top-4 sm:px-24">
        <PlayerCard seat={0} />
        <PlayerCard seat={1} />
      </div>
      <button
        type="button"
        aria-label="Leave match"
        onClick={onLeave}
        className="pointer-events-auto absolute top-3 left-3 grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim sm:top-4 sm:left-8"
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col gap-2 sm:top-4 sm:right-8">
        <button
          type="button"
          aria-label="Settings"
          onClick={() => useUi.getState().openSheet('settings')}
          className="grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim"
        >
          <GearSixIcon weight="bold" className="size-5" />
        </button>
        <FullscreenButton className="bg-ink/85" />
      </div>

      {watching && (
        <div className="absolute inset-x-0 bottom-20 flex justify-center">
          <span className="rounded-full border-2 border-line bg-ink/85 px-3 py-1 font-display text-xs text-cream-dim">
            WATCHING · YOU PLAY THE NEXT RACK
          </span>
        </div>
      )}
      {(message || hint) && (
        <div className="absolute inset-x-0 top-28 flex justify-center px-4 sm:top-24">
          <div className="rounded-full border-2 border-line bg-ink/85 px-4 py-1.5 text-center text-sm text-cream shadow-lg">
            {hint ?? message}
          </div>
        </div>
      )}

      {!watching && <PowerCue enabled={myTurn && !(mustCall && calledPocket < 0)} />}
      {!watching && <SpinBall enabled={myTurn} />}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2">
        <Button
          size="sm"
          sound="ui.click"
          onClick={() => (aim.view = aim.view === 'table' ? 'cue' : 'table')}
        >
          <CameraIcon weight="bold" /> View
        </Button>
      </div>
    </div>
  );
}
