import { ArrowCounterClockwiseIcon, FastForwardIcon } from '@phosphor-icons/react';
import { AnimatePresence, m } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { formatUnits } from 'viem';

import { countUpValue, tierFor } from '@arena/fx';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { Button } from '@/ui/Button.tsx';

import { HERO_NAMES } from '../sprites.ts';
import { playWager } from './audio.ts';
import { RESULT_COUNT_UP_MS, SLOW_VRF_MS } from './constants.ts';
import { HeroPortrait } from './HeroPortrait.tsx';
import { useWager } from './store.ts';

const FALLBACK_DECIMALS = 18;
const RESULT_TITLES = ['FLAWLESS!', 'WINNER!', 'RUNNER-UP', 'OUT'] as const;
const RESULT_LINES = [
  (h: string) => `${h} won without a scratch.`,
  (h: string) => `${h} is the last bird standing.`,
  (h: string) => `${h} outlasted everyone but the winner.`,
  (h: string) => `${h} didn't make it this time.`,
] as const;
const ENTER = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;
const fmt = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function WagerHud({ onReveal }: { onReveal: (sessionId: string) => void }) {
  const phase = useWager((s) => s.phase);
  return (
    <AnimatePresence>
      {(phase === 'placing' || phase === 'waiting') && <Suspense key="suspense" />}
      {phase === 'fight' && <FightBar key="fight" />}
      {phase === 'result' && <ResultCard key="result" onReveal={onReveal} />}
    </AnimatePresence>
  );
}

function Suspense() {
  const hero = useWager((s) => s.hero);
  const phase = useWager((s) => s.phase);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_VRF_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <m.div
      className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-3"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, transition: ENTER }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-gold-deep bg-ink-2/95 px-6 py-4 shadow-[0_12px_40px_rgb(0_0_0/0.5)]">
        <HeroPortrait hero={hero} className="w-14 animate-bounce" />
        <div>
          <div className="font-display text-3xl text-gold">BETS CLOSED</div>
          <div className="text-cream-dim">
            {phase === 'placing'
              ? 'Locking your bet on chain…'
              : `The chain is deciding ${HERO_NAMES[hero]}'s fate…`}
          </div>
        </div>
      </div>
      {slow && (
        <p className="rounded-full bg-ink-2/90 px-4 py-1 text-sm text-cream-dim">
          Still waiting on the chain's randomness. Your stake is safe.
        </p>
      )}
    </m.div>
  );
}

function FightBar() {
  const hero = useWager((s) => s.hero);
  const fight = useWager((s) => s.fight);
  const { mode, snapshot } = useCasinoBridge();
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  return (
    <m.div
      className="pointer-events-none absolute inset-x-0 bottom-6 flex items-end justify-between px-4 sm:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: ENTER }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border-2 border-tomato bg-ink-2/95 px-4 py-2">
        <HeroPortrait hero={hero} className="w-10" />
        <div className="leading-tight">
          <div className="font-pixel text-[11px] uppercase text-tomato">Your bird</div>
          <div className="font-display text-lg">{HERO_NAMES[hero]}</div>
        </div>
        {fight && (
          <div className="tabular ml-3 border-l-2 border-line pl-3 font-bold text-gold">
            {fmt(Number(formatUnits(fight.wager, decimals)))}{' '}
            <span className="font-pixel text-xs">{unit}</span>
          </div>
        )}
      </div>
      {/* Raised above the bottom-right corner, which the jam widget owns. */}
      <div className="pointer-events-auto mb-20 sm:mb-16">
        <Button size="sm" onClick={() => useWager.getState().set({ skipRequested: true })}>
          <FastForwardIcon weight="bold" /> Skip
        </Button>
      </div>
    </m.div>
  );
}

function ResultCard({ onReveal }: { onReveal: (sessionId: string) => void }) {
  const { hero, fight } = useWager();
  const { mode, snapshot } = useCasinoBridge();
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  const [shown, setShown] = useState(0);
  const revealed = useRef(false);

  const wager = fight ? Number(formatUnits(fight.wager, decimals)) : 0;
  const payout = fight ? Number(formatUnits(fight.payout, decimals)) : 0;
  const multiplier = wager > 0 ? payout / wager : 0;
  const tier = tierFor(multiplier);
  const outcome = fight?.outcomeClass ?? 3;

  useEffect(() => {
    if (!fight) return;
    playWager(
      tier === 'loss'
        ? 'wager.lose'
        : tier === 'big' || tier === 'jackpot'
          ? 'wager.bigwin'
          : 'wager.win',
    );
    if (payout > 0) playWager('wager.coins');
    const duration = RESULT_COUNT_UP_MS[tier];
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const t = duration > 0 ? Math.min(1, (performance.now() - started) / duration) : 1;
      setShown(countUpValue(0, payout, t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else if (!revealed.current) {
        // The host hides winnings until reveal, so the balance ticks up exactly as the count lands.
        revealed.current = true;
        onReveal(fight.sessionId);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fight, payout, tier, onReveal]);

  const done = () => {
    if (fight && !revealed.current) onReveal(fight.sessionId);
    useWager.getState().reset();
    useGameMachine.getState().send('leaving');
  };
  const again = () => {
    if (fight && !revealed.current) onReveal(fight.sessionId);
    useWager.getState().reset();
    useWager.getState().set({ sheetOpen: true });
    useGameMachine.getState().send('leaving');
  };

  return (
    <m.div
      className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/40 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <m.div
        role="dialog"
        aria-label="Round result"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]"
        initial={{ scale: 0.6, y: 30 }}
        animate={{ scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 22 } }}
      >
        <HeroPortrait hero={hero} className={outcome === 3 ? 'w-20 grayscale' : 'w-20'} />
        <div
          className={`font-display text-5xl ${outcome <= 1 ? 'text-gold' : outcome === 2 ? 'text-teal' : 'text-cream-dim'}`}
        >
          {RESULT_TITLES[outcome]}
        </div>
        <p className="text-cream-dim">{RESULT_LINES[outcome]?.(HERO_NAMES[hero])}</p>
        <div
          className={`tabular font-display text-4xl ${payout > 0 ? 'text-gold' : 'text-cream-dim'}`}
        >
          {payout > 0 ? `+${fmt(shown)}` : fmt(0)}{' '}
          <span className="font-pixel text-base">{unit}</span>
        </div>
        <div className="tabular text-sm text-cream-dim">
          {fmt(wager)} {unit} × {multiplier.toFixed(1)}
        </div>
        <div className="mt-2 flex gap-3">
          <Button variant="gold" sound="ui.confirm" onClick={again}>
            <ArrowCounterClockwiseIcon weight="bold" /> Back again
          </Button>
          <Button sound="ui.back" onClick={done}>
            Done
          </Button>
        </div>
        {fight && (
          <p className="font-pixel text-[10px] uppercase tracking-wider text-cream-dim/70">
            Fight seed {fight.seed} · bank v1 · replay it anytime
          </p>
        )}
      </m.div>
    </m.div>
  );
}
