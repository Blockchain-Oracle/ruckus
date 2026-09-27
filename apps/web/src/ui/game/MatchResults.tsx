import { ArrowCounterClockwiseIcon, SignOutIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';

export type ResultRow = {
  key: string;
  /** "1st", "2" … */
  place: string;
  name: string;
  color: string;
  /** The row's headline number: a time, "3 wins", a distance. */
  value: string;
  /** A small extra column (coins). */
  extra?: string;
  you: boolean;
  /** Optional art before the name (a portrait). */
  icon?: ReactNode;
};

type Props = {
  title: string;
  /** Gold title when you won. */
  won: boolean;
  /** One line under the title (the 8-ball call, how it ended). */
  subtitle?: string | null;
  /** A big centrepiece instead of, or above, rows (Soccer's score). */
  hero?: ReactNode;
  rows?: readonly ResultRow[];
  /**
   * Online, the server returns everyone to the room lobby: no local rematch here. Rematch votes and
   * Next game arrive with the party room (ADR-009, stage S36).
   */
  online: boolean;
  onRematch(): void;
  onLeave(): void;
  rematchLabel?: string;
  /** One more action above the pair (Neon Dash's "Challenge a friend"). */
  extra?: { label: string; icon?: ReactNode; onClick(): void } | undefined;
};

/**
 * The one results screen every game uses (ADR-010): the same title, rows with your line
 * highlighted, and the same two actions in the same place. Capped to the viewport; rows scroll.
 */
export function MatchResults({
  title,
  won,
  subtitle,
  hero,
  rows,
  online,
  onRematch,
  onLeave,
  rematchLabel = 'Rematch',
  extra,
}: Props) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-ink/55 p-3">
      <div
        role="dialog"
        aria-label="Match result"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md min-w-0 flex-col gap-3 rounded-2xl border-2 border-line bg-ink-2 p-5 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)] sm:gap-4 sm:p-6"
      >
        <div
          className={cn(
            'shrink-0 font-display text-4xl leading-none sm:text-5xl',
            won ? 'text-gold' : 'text-cream',
          )}
        >
          {title}
        </div>
        {subtitle && <p className="shrink-0 text-sm text-cream-dim">{subtitle}</p>}
        {hero && <div className="shrink-0">{hero}</div>}
        {rows && rows.length > 0 && (
          <ol className="flex min-h-0 flex-col gap-1.5 overflow-y-auto text-left">
            {rows.map((r) => (
              <li
                key={r.key}
                className={cn(
                  'flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm',
                  r.you ? 'border-cream bg-ink-3' : 'border-line bg-ink-3/60',
                )}
              >
                <span className="w-9 font-display text-lg text-cream">{r.place}</span>
                {r.icon ?? (
                  <span className="size-3 shrink-0 rounded-full" style={{ background: r.color }} />
                )}
                <span className="min-w-0 flex-1 truncate text-cream">{r.name}</span>
                {r.you && (
                  // Narrow phones: the outlined row already says it; the name gets the room.
                  <span className="rounded-full bg-cream px-1.5 font-display text-[10px] text-ink max-[380px]:hidden">
                    YOU
                  </span>
                )}
                <span className="font-display text-cream tabular-nums">{r.value}</span>
                {r.extra && (
                  <span className="w-10 text-right text-gold tabular-nums">{r.extra}</span>
                )}
              </li>
            ))}
          </ol>
        )}
        {online && <p className="shrink-0 text-xs text-cream-dim">Back to the room in a moment.</p>}
        <div className="grid shrink-0 grid-cols-2 gap-3 *:min-w-0 *:px-3">
          {extra && (
            <Button
              variant="teal"
              sound="ui.confirm"
              className="col-span-2"
              onClick={extra.onClick}
            >
              {extra.icon} {extra.label}
            </Button>
          )}
          {online ? (
            <Button sound="ui.back" className="col-span-2" onClick={onLeave}>
              <SignOutIcon weight="bold" /> Leave room
            </Button>
          ) : (
            <>
              <Button variant="tomato" sound="ui.confirm" onClick={onRematch}>
                <ArrowCounterClockwiseIcon weight="bold" /> {rematchLabel}
              </Button>
              <Button sound="ui.back" onClick={onLeave}>
                Back
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
