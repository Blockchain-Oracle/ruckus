import { ArrowLeftIcon, ArrowsClockwiseIcon, FastForwardIcon } from '@phosphor-icons/react';
import { formatUnits } from 'viem';

import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';

import { KITS } from '../config.ts';
import { Announce } from '../hud/Announce.tsx';
import { ScoreBug } from '../hud/ScoreBug.tsx';
import { useTick } from '../hud/useTick.ts';
import { getDriver } from '../match/runtime.ts';
import { callFor, describeFinish, type FinishPick, type TeamPick } from './calls.ts';
import { openCallTheFinish, placeFinishCall } from './controller.ts';
import { useFinishBet } from './store.ts';

const FALLBACK_DECIMALS = 18;
const HUD_HZ = 10;
const STAKES = ['0.5', '1', '5', '10'] as const;
const TEAMS = [
  { v: 'tomato', label: 'Tomato', color: KITS[0].body },
  { v: 'either', label: 'Either', color: '#fff1d6' },
  { v: 'violet', label: 'Violet', color: KITS[1].body },
] as const satisfies readonly { v: TeamPick; label: string; color: string }[];
const FINISHES = [
  { v: 'any', label: 'Any goal' },
  { v: 'shot', label: 'Shot' },
  { v: 'header', label: 'Header' },
  { v: 'wood', label: 'Off the bar' },
  { v: 'none', label: 'No goal' },
] as const satisfies readonly { v: FinishPick; label: string }[];
const fmt = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const chip = (on: boolean) =>
  cn(
    'min-w-0 rounded-lg border-2 px-2 py-1.5 font-display text-xs sm:text-sm',
    on ? 'border-gold bg-ink-3 text-cream' : 'border-line text-cream-dim hover:border-cream-dim',
  );

/** Call the Finish: the call sheet, the drumroll, the match banner and the result card. */
export function FinishHud({ onLeave }: { onLeave: () => void }) {
  useTick(HUD_HZ);
  const { mode, api, snapshot } = useCasinoBridge();
  const { phase, team, finish, stake, set, result } = useFinishBet();
  if (phase === 'off') return null;
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  const ready = snapshot?.wallet.status === 'ready' && Boolean(api);
  const call = callFor(team, finish);
  const w = getDriver()?.world;

  return (
    <div className="pointer-events-none absolute inset-0">
      <button
        type="button"
        aria-label="Leave"
        onClick={onLeave}
        className="pointer-events-auto absolute top-3 left-3 grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim sm:top-4 sm:left-8"
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-16 sm:top-4">
        {phase === 'match' && w ? (
          <ScoreBug w={w} names={['Tomato', 'Violet', 'Tomato', 'Violet']} you={-1} />
        ) : (
          <div className="rounded-full border-2 border-gold-deep bg-ink/85 px-4 py-1.5 text-center font-display text-xs text-gold sm:text-sm">
            CALL THE FINISH · {mode === 'demo' ? 'DEMO CREDITS, NO VALUE' : 'RTP 96% ON EVERY CALL'}
          </div>
        )}
        {(phase === 'match' || phase === 'result') && (
          <div className="rounded-full border border-line bg-ink/85 px-3 py-1 text-xs text-cream">
            Your call: <span className="font-display text-gold">{call.name}</span> · pays{' '}
            {call.pays.toFixed(2)}×
          </div>
        )}
      </div>
      <Announce />

      {phase === 'setup' && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-3 mx-auto flex max-h-[calc(100dvh-5rem)] w-[min(640px,calc(100%-1.5rem))] flex-col gap-2.5 overflow-y-auto rounded-2xl border-2 border-line bg-ink-2/95 p-3 shadow-[0_20px_60px_rgb(0_0_0/0.55)] sm:bottom-6 sm:gap-3 sm:p-4">
          <p className="text-xs text-cream-dim sm:text-sm">
            Two bots a side play 20 seconds of golden goal. Call how it ends. Every call returns
            96%: the rarer the call, the more it pays.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TEAMS.map((t) => (
              <button
                key={t.v}
                type="button"
                className={cn(
                  chip(team === t.v && finish !== 'none'),
                  finish === 'none' && 'opacity-60',
                )}
                // No goal belongs to neither team: picking a team moves the call back to a goal.
                onClick={() => set({ team: t.v, finish: finish === 'none' ? 'any' : finish })}
              >
                <span
                  className="mr-1.5 inline-block size-2.5 rounded-full align-middle"
                  style={{ background: t.color }}
                />
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {FINISHES.map((f) => (
              <button
                key={f.v}
                type="button"
                className={chip(finish === f.v)}
                onClick={() => set({ finish: f.v })}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-display text-teal">{call.name}</span>
            <span className="tabular shrink-0 text-cream">
              {call.chance} · pays <span className="font-display text-gold">{call.pays}×</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="flex items-center gap-2 text-sm text-cream-dim"
              htmlFor="finish-stake"
            >
              Stake
              <input
                id="finish-stake"
                value={stake}
                inputMode="decimal"
                onChange={(e) => set({ stake: e.target.value.replace(/[^0-9.]/g, '') })}
                className="tabular h-10 w-20 rounded-md border-2 border-line bg-ink px-2 text-cream outline-none focus:border-teal"
              />
            </label>
            {STAKES.map((v) => (
              <Button key={v} size="sm" className="px-3" onClick={() => set({ stake: v })}>
                {v}
              </Button>
            ))}
          </div>
          <Button
            variant="gold"
            sound="ui.confirm"
            className="w-full min-w-0 px-3 text-sm sm:text-base"
            disabled={!ready}
            onClick={() => void placeFinishCall(api, decimals)}
          >
            Call it · win {fmt(Number(stake || 0) * call.pays)} {unit}
          </Button>
          {!ready && (
            <p className="text-center text-xs text-cream-dim">Connecting to the casino…</p>
          )}
        </div>
      )}

      {(phase === 'placing' || phase === 'waiting') && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center px-4">
          <div className="animate-pulse rounded-full border-2 border-gold-deep bg-ink/90 px-5 py-2 text-center font-display text-base text-gold sm:text-lg">
            {phase === 'placing' ? 'LOCKING IN YOUR CALL…' : 'THE CHAIN IS PICKING THE MATCH…'}
          </div>
        </div>
      )}

      {phase === 'match' && (
        <button
          type="button"
          onClick={() => getDriver()?.skipToFinish()}
          className="pointer-events-auto absolute right-3 bottom-4 inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-ink/85 px-3 py-1.5 text-xs text-cream hover:border-cream-dim sm:right-8"
        >
          <FastForwardIcon weight="bold" /> Skip to the finish
        </button>
      )}

      {phase === 'result' && result && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/40 p-3">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-sm flex-col items-center gap-3 overflow-y-auto rounded-2xl border-2 border-line bg-ink-2 p-5 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
            <div
              className={`font-display text-3xl sm:text-4xl ${result.made ? 'text-gold' : 'text-cream-dim'}`}
            >
              {result.made ? 'CALLED IT!' : 'NOT THIS TIME'}
            </div>
            <p className="text-sm text-cream">{describeFinish(result.finish)}.</p>
            <div
              className={`tabular font-display text-3xl ${result.made ? 'text-gold' : 'text-cream-dim'}`}
            >
              {result.made ? `+${fmt(Number(formatUnits(result.payout, decimals)))}` : fmt(0)}{' '}
              <span className="font-pixel text-base">{unit}</span>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="gold"
                sound="ui.confirm"
                className="w-full min-w-0 px-2 text-sm"
                onClick={openCallTheFinish}
              >
                <ArrowsClockwiseIcon weight="bold" /> Call again
              </Button>
              <Button sound="ui.back" className="w-full min-w-0 px-2 text-sm" onClick={onLeave}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
