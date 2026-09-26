import { FlagCheckeredIcon } from '@phosphor-icons/react';
import { m } from 'motion/react';

import {
  COIN_VALUE,
  COURSE_M,
  momentum,
  PICKUPS,
  speedOf,
  standings,
  TICK_HZ,
  type World,
} from '@arena/sim-runner';

import { SLOTS } from '../config.ts';
import { ordinal } from '../match/flow.ts';
import { PICKUP_LOOK } from '../render/textures.ts';

const MPS_TO_KMH = 3.6;

/** The race as a rail: every runner's dot on the way to the flag, and the metres left for you. */
export function ProgressRail({ w, you }: { w: World; you: number }) {
  const me = w.runners[you];
  const left = me ? Math.max(0, Math.ceil(COURSE_M - me.s)) : 0;
  return (
    <div className="flex w-[min(30rem,calc(100vw-9rem))] flex-col items-center gap-1">
      <div className="relative h-3 w-full rounded-full border-2 border-line bg-ink/80">
        {w.runners.map((r, i) => {
          const at = Math.min(1, r.s / COURSE_M);
          const mine = i === you;
          return (
            <span
              key={SLOTS[i]?.name}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink transition-[left] duration-100"
              style={{
                left: `${at * 100}%`,
                width: mine ? 18 : 12,
                height: mine ? 18 : 12,
                background: SLOTS[i]?.color,
                opacity: r.out ? 0.35 : 1,
                zIndex: mine ? 2 : 1,
                boxShadow: mine ? '0 0 0 2px #fff1d6' : undefined,
              }}
            />
          );
        })}
        <FlagCheckeredIcon
          weight="fill"
          className="absolute top-1/2 -right-6 size-5 -translate-y-1/2 text-cream"
        />
      </div>
      {me && (
        <div className="font-display text-xs text-cream [text-shadow:0_2px_0_#1b1024]">
          {me.finished >= 0 ? 'FINISHED' : me.out ? 'OUT' : `${left.toLocaleString()} m to go`}
        </div>
      )}
    </div>
  );
}

/** Coins (your life and your speed), and how fast you're going. */
export function CoinsAndSpeed({ w, you }: { w: World; you: number }) {
  const me = w.runners[you];
  if (!me) return null;
  const coins = Math.floor(me.coins / COIN_VALUE);
  const bonus = Math.round((momentum(me) - 1) * 100);
  const kmh = w.phase === 'run' && me.finished < 0 && !me.out ? speedOf(me) * MPS_TO_KMH : 0;
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2 rounded-full border-2 border-gold/70 bg-ink/85 py-1 pr-3 pl-1.5 font-display text-xl text-gold">
        <span className="grid size-6 place-items-center rounded-full bg-gold text-sm text-ink shadow-[inset_0_-2px_0_#b8780e]">
          ◆
        </span>
        {/* Keyed on the count, so every change pops. */}
        <m.span
          key={coins}
          initial={{ scale: 1.35 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          className="inline-block tabular-nums"
        >
          {coins}
        </m.span>
        <span
          className="ml-1 font-sans text-[0.65rem] leading-tight text-cream-dim"
          title="Every coin you carry adds 1% speed"
        >
          +{bonus}%
          <br />
          speed
        </span>
      </div>
      <div className="rounded-full bg-ink/70 px-2.5 py-0.5 font-display text-sm text-cream tabular-nums">
        {Math.round(kmh)} <span className="text-xs text-cream-dim">km/h</span>
      </div>
    </div>
  );
}

/** Your active orb: what it is and how long it has left. */
export function PowerChip({ w, you }: { w: World; you: number }) {
  const me = w.runners[you];
  const p = me?.power;
  if (!me || !p) return null;
  const look = PICKUP_LOOK[p];
  const total = PICKUPS[p].seconds * TICK_HZ;
  return (
    <div
      className="flex items-center gap-2 rounded-full border-2 bg-ink/90 px-3 py-1 text-sm"
      style={{ borderColor: look.tone }}
    >
      <span className="font-display" style={{ color: look.tone }}>
        {look.label}
      </span>
      <span className="text-xs text-cream-dim">{look.tip}</span>
      {p !== 'shield' && (
        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full"
            style={{ width: `${(me.powerTicks / total) * 100}%`, background: look.tone }}
          />
        </span>
      )}
    </div>
  );
}

/** Live places: who's ahead of whom, with the gap in metres. */
export function Standings({ w, you, names }: { w: World; you: number; names: string[] }) {
  const order = standings(w);
  const lead = w.runners[order[0] ?? 0];
  return (
    <ol className="flex flex-col gap-1 text-xs">
      {order.map((i, place) => {
        const r = w.runners[i];
        if (!r) return null;
        const gap = lead && lead !== r ? Math.round(lead.s - r.s) : 0;
        return (
          <li
            key={SLOTS[i]?.name}
            className={`flex items-center gap-2 rounded-full bg-ink/80 py-0.5 pr-2.5 pl-1 ${i === you ? 'ring-2 ring-cream' : ''}`}
          >
            <span className="w-7 text-right font-display text-cream">{ordinal(place + 1)}</span>
            <span className="size-2.5 rounded-full" style={{ background: SLOTS[i]?.color }} />
            <span
              className={`max-w-24 truncate ${r.out ? 'text-cream-dim line-through' : 'text-cream'}`}
            >
              {names[i] ?? SLOTS[i]?.name}
            </span>
            {gap > 0 && <span className="text-cream-dim tabular-nums">−{gap} m</span>}
          </li>
        );
      })}
    </ol>
  );
}
