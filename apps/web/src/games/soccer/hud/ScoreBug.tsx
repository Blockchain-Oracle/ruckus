import { FROZEN_S, POWERUP_DURATION_S, TICK_HZ, type World } from '@arena/sim-soccer';

import { cn } from '@/lib/utils.ts';

import { KITS } from '../config.ts';
import { POWER_LOOK } from '../render/icons.ts';

/** The clock turns urgent for the last seconds. */
const URGENT_S = 10;

const mmss = (ticks: number) => {
  const s = Math.max(0, Math.ceil(ticks / TICK_HZ));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Broadcast-style score bug: team, name, score · clock · score, name, team. */
export function ScoreBug({ w, names, you }: { w: World; names: string[]; you: number }) {
  const secondsLeft = Math.ceil(w.clock / TICK_HZ);
  const urgent = secondsLeft <= URGENT_S && w.phase !== 'over';
  const teamLabel = (team: 0 | 1) => {
    const seats = names.filter((_, i) => i % 2 === team).map((n) => n.replace(/^Bot · /, ''));
    return seats.length > 1 ? KITS[team].name : (seats[0] ?? KITS[team].name);
  };
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-line bg-ink/90 font-display shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
      {([0, 1] as const).map((team) => (
        <div
          key={team}
          className={cn(
            'flex items-center gap-2 px-3 py-1',
            team === 1 && 'order-3 flex-row-reverse',
          )}
        >
          <span
            className="size-3 rounded-full ring-2 ring-cream/70"
            style={{ background: KITS[team].body }}
          />
          <span
            className={cn(
              'max-w-[7rem] truncate text-xs uppercase sm:max-w-[10rem] sm:text-sm',
              you >= 0 && you % 2 === team ? 'text-gold' : 'text-cream',
            )}
          >
            {teamLabel(team)}
          </span>
          {you >= 0 && you % 2 === team && (
            <span className="rounded-full bg-gold px-1.5 text-[10px] text-ink">YOU</span>
          )}
          <span className="tabular min-w-[1.5ch] text-center text-2xl text-cream sm:text-3xl">
            {w.score[team]}
          </span>
        </div>
      ))}
      <div
        className={cn(
          'tabular order-2 grid place-items-center px-3 text-lg sm:text-xl',
          urgent ? 'animate-pulse bg-tomato text-cream' : 'bg-ink-3 text-cream',
        )}
      >
        {mmss(w.clock)}
      </div>
    </div>
  );
}

/** Active effects, each with a draining bar (Eggy shows them in the top corner). */
export function PowerChips({ w }: { w: World }) {
  const chips: { key: string; label: string; tone: string; left: number; team?: 0 | 1 }[] = [];
  const full = POWERUP_DURATION_S * TICK_HZ;
  w.players.forEach((p, i) => {
    const team = (i % 2) as 0 | 1;
    if (p.speed > 0)
      chips.push({
        key: `s${i}`,
        label: POWER_LOOK.speed.label,
        tone: POWER_LOOK.speed.tone,
        left: p.speed / full,
        team,
      });
    if (p.grow > 0)
      chips.push({
        key: `g${i}`,
        label: POWER_LOOK.growPlayer.label,
        tone: POWER_LOOK.growPlayer.tone,
        left: p.grow / full,
        team,
      });
    if (p.shrink > 0)
      chips.push({
        key: `h${i}`,
        label: POWER_LOOK.shrinkPlayer.label,
        tone: POWER_LOOK.shrinkPlayer.tone,
        left: p.shrink / full,
        team,
      });
    if (p.frozen > 0)
      chips.push({
        key: `f${i}`,
        label: 'Frozen',
        tone: POWER_LOOK.freeze.tone,
        left: p.frozen / (FROZEN_S * TICK_HZ),
        team,
      });
  });
  if (w.ballBouncy > 0)
    chips.push({
      key: 'bb',
      label: POWER_LOOK.bouncy.label,
      tone: POWER_LOOK.bouncy.tone,
      left: w.ballBouncy / full,
    });
  if (w.ballGrow > 0)
    chips.push({
      key: 'bg',
      label: POWER_LOOK.growBall.label,
      tone: POWER_LOOK.growBall.tone,
      left: w.ballGrow / full,
    });
  if (w.ballShrink > 0)
    chips.push({
      key: 'bs',
      label: POWER_LOOK.shrinkBall.label,
      tone: POWER_LOOK.shrinkBall.tone,
      left: w.ballShrink / full,
    });
  // 2v2 effects land on both teammates at once: one chip per team is enough.
  const seen = new Set<string>();
  const unique = chips.filter((c) => {
    const id = `${c.label}:${c.team ?? 'ball'}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (unique.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {unique.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-1.5 rounded-full border border-line bg-ink/85 py-0.5 pr-2 pl-1 text-[11px] text-cream"
        >
          {c.team !== undefined && (
            <span className="size-2.5 rounded-full" style={{ background: KITS[c.team].body }} />
          )}
          <span style={{ color: c.tone }} className="font-display">
            {c.label}
          </span>
          <span className="h-1 w-8 overflow-hidden rounded-full bg-black/50">
            <span
              className="block h-full"
              style={{ width: `${Math.max(0, Math.min(1, c.left)) * 100}%`, background: c.tone }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
