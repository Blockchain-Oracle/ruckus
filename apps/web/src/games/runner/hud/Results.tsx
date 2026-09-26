import { ShareNetworkIcon } from '@phosphor-icons/react';

import { COIN_VALUE, COUNTDOWN_S, standings, TICK_HZ, type World } from '@arena/sim-runner';

import { Button } from '@/ui/Button.tsx';

import { SLOTS } from '../config.ts';
import { ordinal } from '../match/flow.ts';

/** The race clock starts at GO, after the countdown. */
const COUNTDOWN_TICKS = COUNTDOWN_S * TICK_HZ;
const clock = (ticks: number) => {
  const s = ticks / TICK_HZ;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};

/** The finish board: places, times (or how far a runner got), coins; rematch or back. */
export function Results({
  w,
  you,
  names,
  online,
  onRematch,
  onLeave,
  onChallenge,
}: {
  w: World;
  you: number;
  names: string[];
  online: boolean;
  onRematch: () => void;
  onLeave: () => void;
  /** Offline races only: share your run as a "beat my run" link. */
  onChallenge?: (() => void) | undefined;
}) {
  const mine = w.runners[you];
  const order = standings(w);
  const place = order.indexOf(you) + 1;
  const title = place === 1 ? 'YOU WIN!' : place > 0 ? `${ordinal(place)} place` : 'RACE OVER';
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center overflow-y-auto bg-ink/55 p-3">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col gap-3 rounded-2xl border-2 border-line bg-ink-2 p-5 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div
          className={`shrink-0 font-display text-4xl ${place === 1 ? 'text-gold' : 'text-cream'}`}
        >
          {title}
        </div>
        <ol className="min-h-0 overflow-y-auto">
          {order.map((i, k) => {
            const r = w.runners[i];
            if (!r) return null;
            const result =
              r.finished >= 0
                ? clock(r.finished - COUNTDOWN_TICKS)
                : r.out
                  ? `Wiped out · ${Math.round(r.s)} m`
                  : `${Math.round(r.s)} m`;
            return (
              <li
                key={SLOTS[i]?.name}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === you ? 'bg-ink-3' : ''}`}
              >
                <span className="w-9 text-left font-display text-lg text-cream">
                  {ordinal(k + 1)}
                </span>
                <span className="size-3 rounded-full" style={{ background: SLOTS[i]?.color }} />
                <span className="flex-1 truncate text-left text-cream">
                  {names[i] ?? SLOTS[i]?.name}
                </span>
                <span className="font-display text-cream tabular-nums">{result}</span>
                <span className="w-10 text-right text-gold tabular-nums">
                  ◆{Math.floor(r.coins / COIN_VALUE)}
                </span>
              </li>
            );
          })}
        </ol>
        {online && (
          <p className="text-xs text-cream-dim">Back to the room in a moment for the next race.</p>
        )}
        <div className="flex shrink-0 flex-wrap justify-center gap-3">
          {!online && (
            <Button variant="tomato" sound="ui.confirm" onClick={onRematch}>
              Race again
            </Button>
          )}
          {onChallenge && mine && mine.finished >= 0 && (
            <Button variant="gold" sound="ui.coin" onClick={onChallenge}>
              <ShareNetworkIcon weight="bold" /> Challenge a friend
            </Button>
          )}
          <Button sound="ui.back" onClick={onLeave}>
            {online ? 'Leave room' : 'Back to hub'}
          </Button>
        </div>
      </div>
    </div>
  );
}
