import { ArrowLeftIcon, ArrowsClockwiseIcon, FastForwardIcon } from '@phosphor-icons/react';
import { formatUnits } from 'viem';

import { WIPEOUT_CALLS } from '@arena/casino-math';

import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import { RoundBanner } from '@/ui/RoundBanner.tsx';
import { StakeField } from '@/ui/StakeField.tsx';

import { Announce } from '../hud/Announce.tsx';
import { useTick } from '../hud/useTick.ts';
import { getDriver } from '../match/runtime.ts';
import { callAt, describeEnding } from './calls.ts';
import { openCallTheWipeout, placeWipeoutCall } from './controller.ts';
import { useWipeoutBet } from './store.ts';

const FALLBACK_DECIMALS = 18;
const HUD_HZ = 10;
const fmt = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Call the Wipeout: the call sheet, the drumroll, the run banner and the result card. */
export function WipeoutHud({ onLeave }: { onLeave: () => void }) {
  useTick(HUD_HZ);
  const { mode, api, snapshot } = useCasinoBridge();
  const { phase, call: picked, stake, set, result } = useWipeoutBet();
  if (phase === 'off') return null;
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  const ready = snapshot?.wallet.status === 'ready' && Boolean(api);
  const call = callAt(picked);

  return (
    <div className="pointer-events-none hud-frame">
      <button
        type="button"
        aria-label="Leave"
        onClick={onLeave}
        className="pointer-events-auto absolute top-3 left-3 grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim sm:top-4 sm:left-8"
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-16 sm:top-4">
        <RoundBanner title="CALL THE WIPEOUT" demo={mode === 'demo'} />
        {(phase === 'run' || phase === 'result') && (
          <div className="rounded-full border border-line bg-ink/85 px-3 py-1 text-xs text-cream">
            Your call:{' '}
            <span className="font-display" style={{ color: call.look.color }}>
              {call.look.label}
            </span>{' '}
            · pays {call.pays.toFixed(2)}×
          </div>
        )}
      </div>
      <Announce />

      {phase === 'setup' && (
        // Fits any screen: the tiles scroll, the call and its button stay pinned, and on smaller
        // screens the sheet sits clear of the jam badge in the bottom-right corner.
        <div className="pointer-events-auto absolute inset-x-0 bottom-14 mx-auto flex max-h-[calc(100dvh-8.5rem)] w-[min(640px,calc(100%-1.5rem))] flex-col rounded-2xl border-2 border-line bg-ink-2/95 shadow-[0_20px_60px_rgb(0_0_0/0.55)] lg:bottom-6 lg:max-h-[calc(100dvh-6rem)]">
          <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3 pb-2 sm:gap-3 sm:p-4 sm:pb-2">
            <p className="text-xs text-cream-dim sm:text-sm [@media(max-height:420px)]:hidden">
              A runner takes on a neon gauntlet with no coins, so the first hit ends the run. Call
              what stops them. Every call returns 96%: the rarer the call, the more it pays.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WIPEOUT_CALLS.map((_, i) => {
                const c = callAt(i);
                return (
                  <button
                    key={c.betType}
                    type="button"
                    onClick={() => set({ call: i })}
                    className={cn(
                      'flex min-w-0 items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left sm:px-2.5 sm:py-2',
                      picked === i ? 'border-gold bg-ink-3' : 'border-line hover:border-cream-dim',
                    )}
                  >
                    <span
                      className="size-3.5 shrink-0 rounded sm:size-4"
                      style={{ background: c.look.color, boxShadow: `0 0 10px ${c.look.color}` }}
                    />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block font-display text-xs text-cream sm:text-sm">
                        {c.look.label}
                      </span>
                      <span className="block text-[0.68rem] text-cream-dim">{c.look.sub}</span>
                    </span>
                    <span className="tabular shrink-0 font-display text-xs text-gold sm:text-sm">
                      {c.pays}×
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Pinned with the call: on a small phone the scrolling grid used to hide the stake. */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-line/60 p-3 pt-2 sm:p-4 sm:pt-2">
            <StakeField id="wipeout-stake" value={stake} onChange={(v) => set({ stake: v })} />
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate font-display text-teal">{call.name}</span>
              <span className="tabular shrink-0 text-cream">
                {call.chance} · pays <span className="font-display text-gold">{call.pays}×</span>
              </span>
            </div>
            <Button
              variant="gold"
              sound="ui.confirm"
              className="w-full min-w-0 px-3 text-sm sm:text-base"
              disabled={!ready}
              onClick={() => void placeWipeoutCall(api, decimals)}
            >
              Call it · win {fmt(Number(stake || 0) * call.pays)} {unit}
            </Button>
            {!ready && (
              <p className="text-center text-xs text-cream-dim">Connecting to the casino…</p>
            )}
          </div>
        </div>
      )}

      {(phase === 'placing' || phase === 'waiting') && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center px-4">
          <div className="animate-pulse rounded-full border-2 border-gold-deep bg-ink/90 px-5 py-2 text-center font-display text-base text-gold sm:text-lg">
            {phase === 'placing' ? 'LOCKING IN YOUR CALL…' : 'THE CHAIN IS PICKING THE RUN…'}
          </div>
        </div>
      )}

      {phase === 'run' && (
        <button
          type="button"
          onClick={() => getDriver()?.skipToEnd()}
          // Bottom centre: the jam badge owns the bottom-right corner and would swallow the tap.
          className="pointer-events-auto absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center max-sm:left-4 max-sm:translate-x-0 gap-1.5 rounded-full border-2 border-line bg-ink/85 px-3 py-1.5 text-xs text-cream hover:border-cream-dim"
        >
          <FastForwardIcon weight="bold" /> Skip to the end
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
            <p className="text-sm text-cream">{describeEnding(result.ending)}.</p>
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
                onClick={openCallTheWipeout}
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
