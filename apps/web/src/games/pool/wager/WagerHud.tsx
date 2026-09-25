import { ArrowLeftIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { formatUnits } from 'viem';

import { BET_TYPE, getBetTable } from '@arena/casino-math';
import { TIERS } from '@arena/sim-pool';

import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { Button } from '@/ui/Button.tsx';

import { BallChip } from '../hud/BallChip.tsx';
import { PowerCue } from '../hud/PowerCue.tsx';
import { SpinBall } from '../hud/SpinBall.tsx';
import { getDirector } from '../match/runtime.ts';
import { placeCallShot } from './controller.ts';
import { useShotBet } from './store.ts';

const FALLBACK_DECIMALS = 18;
const BPS = 10_000;
const TIER_BET = [
  BET_TYPE.callShotStraight,
  BET_TYPE.callShotCut,
  BET_TYPE.callShotThin,
  BET_TYPE.callShotLong,
] as const;
const TIER_LABEL = {
  straight: 'STRAIGHT',
  cut: 'CUT',
  thin: 'THIN CUT',
  long: 'LONG SHOT',
} as const;
const POCKET_NAMES = [
  'bottom-left corner',
  'bottom-right corner',
  'top-left corner',
  'top-right corner',
  'bottom side',
  'top side',
] as const;
const STAKES = ['0.5', '1', '5', '10'] as const;
const fmt = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The odds a tier offers: chance to make and what it pays (straight from the contract table). */
export function tierOdds(tier: (typeof TIERS)[number]) {
  const table = getBetTable(TIER_BET[TIERS.indexOf(tier)] ?? BET_TYPE.callShotLong);
  const make = table.classes[0];
  const total = table.classes.reduce((s, c) => s + Number(c.weight), 0);
  return {
    chance: `${Number(make?.weight ?? 0)} in ${total}`,
    pays: Number(make?.multiplierBps ?? 0) / BPS,
  };
}

export function CallShotHud({ onLeave }: { onLeave: () => void }) {
  const { mode, api, snapshot } = useCasinoBridge();
  const { phase, call, stake, set, result } = useShotBet();
  if (phase === 'off') return null;
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  const ready = snapshot?.wallet.status === 'ready' && Boolean(api);
  const setup = phase === 'setup';
  const odds = call ? tierOdds(call.tier) : null;

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
      <div className="absolute inset-x-0 top-3 flex justify-center px-16 sm:top-4">
        <div className="rounded-full border-2 border-gold-deep bg-ink/85 px-4 py-1.5 font-display text-sm text-gold">
          CALL YOUR SHOT · {mode === 'demo' ? 'DEMO CREDITS, NO VALUE' : 'RTP 96% ON EVERY CALL'}
        </div>
      </div>

      {setup && <PowerCue enabled />}
      {setup && <SpinBall enabled />}

      {(setup || phase === 'checking') && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-4 mx-auto flex w-[min(640px,calc(100%-2rem))] flex-col gap-3 rounded-2xl border-2 border-line bg-ink-2/95 p-4 shadow-[0_20px_60px_rgb(0_0_0/0.55)] sm:bottom-6">
          <div className="flex min-h-10 items-center gap-3">
            {call && odds ? (
              <>
                <BallChip n={call.ball} className="size-8" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm text-teal">{TIER_LABEL[call.tier]}</div>
                  <div className="truncate text-sm text-cream">
                    The {call.ball} in the {POCKET_NAMES[call.pocket]} · {odds.chance} · pays{' '}
                    {odds.pays.toFixed(2)}×
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-cream-dim">
                Aim at a ball and a pocket. Harder shots pay more; every call returns 96%.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-cream-dim" htmlFor="shot-stake">
              Stake
              <input
                id="shot-stake"
                value={stake}
                inputMode="decimal"
                onChange={(e) => set({ stake: e.target.value.replace(/[^0-9.]/g, '') })}
                className="tabular h-10 w-24 rounded-md border-2 border-line bg-ink px-2 text-cream outline-none focus:border-teal"
              />
            </label>
            {STAKES.map((v) => (
              <Button key={v} size="sm" onClick={() => set({ stake: v })}>
                {v}
              </Button>
            ))}
            <Button
              variant="gold"
              sound="ui.confirm"
              className="ml-auto"
              disabled={!ready || !call || !setup}
              onClick={() => void placeCallShot(api, decimals)}
            >
              {phase === 'checking'
                ? 'Checking the line…'
                : call && odds
                  ? `Call it · win ${fmt(Number(stake || 0) * odds.pays)} ${unit}`
                  : 'Call it'}
            </Button>
          </div>
        </div>
      )}

      {(phase === 'placing' || phase === 'waiting') && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <div className="animate-pulse rounded-full border-2 border-gold-deep bg-ink/90 px-5 py-2 font-display text-lg text-gold">
            {phase === 'placing' ? 'LOCKING IN THE CALL…' : 'THE CHAIN IS CHALKING UP…'}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/40 px-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
            <BallChip n={result.call.ball} className="size-12" />
            <div
              className={`font-display text-4xl ${result.made ? 'text-gold' : 'text-cream-dim'}`}
            >
              {result.made ? 'IN THE HOLE!' : 'RATTLED OUT'}
            </div>
            <div
              className={`tabular font-display text-3xl ${result.made ? 'text-gold' : 'text-cream-dim'}`}
            >
              {result.made ? `+${fmt(Number(formatUnits(result.payout, decimals)))}` : fmt(0)}{' '}
              <span className="font-pixel text-base">{unit}</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="gold"
                sound="ui.confirm"
                onClick={() =>
                  getDirector()?.startWager((useShotBet.getState().layoutSeed * 48271) >>> 0)
                }
              >
                <ArrowsClockwiseIcon weight="bold" /> New table
              </Button>
              <Button sound="ui.back" onClick={onLeave}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {!ready && setup && (
        <p className="absolute inset-x-0 bottom-40 text-center text-xs text-cream-dim">
          Connecting to the casino…
        </p>
      )}
    </div>
  );
}
