import { ShareNetworkIcon } from '@phosphor-icons/react';

import { COIN_VALUE, COUNTDOWN_S, standings, TICK_HZ, type World } from '@arena/sim-runner';

import { MatchResults, type ResultRow } from '@/ui/game/MatchResults.tsx';

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
  const rows = order.flatMap((i, k): ResultRow[] => {
    const r = w.runners[i];
    if (!r) return [];
    const value =
      r.finished >= 0
        ? clock(r.finished - COUNTDOWN_TICKS)
        : r.out
          ? `Out · ${Math.round(r.s)} m`
          : `${Math.round(r.s)} m`;
    return [
      {
        key: SLOTS[i]?.name ?? String(i),
        place: ordinal(k + 1),
        name: names[i] ?? SLOTS[i]?.name ?? '',
        color: SLOTS[i]?.color ?? '#fff1d6',
        value,
        extra: `◆${Math.floor(r.coins / COIN_VALUE)}`,
        you: i === you,
      },
    ];
  });
  return (
    <MatchResults
      title={title}
      won={place === 1}
      rows={rows}
      online={online}
      onRematch={onRematch}
      onLeave={onLeave}
      rematchLabel="Race again"
      extra={
        onChallenge && mine && mine.finished >= 0
          ? {
              label: 'Challenge a friend',
              icon: <ShareNetworkIcon weight="bold" />,
              onClick: onChallenge,
            }
          : undefined
      }
    />
  );
}
