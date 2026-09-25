import { computeMaxWager } from '@chain/casino-sdk/guest';
import { formatUnits, parseUnits } from 'viem';

import { BET_TYPE, getBetTable, maxMultiplierX } from '@arena/casino-math';

import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/ui/primitives/sheet.tsx';

import { HERO_NAMES, HEROES } from '../sprites.ts';
import { STAKE_PRESETS } from './constants.ts';
import { placeBackABird } from './controller.ts';
import { HeroPortrait } from './HeroPortrait.tsx';
import { useWager } from './store.ts';

const FALLBACK_DECIMALS = 18;
const CLASS_LABELS = ['Flawless win', 'Wins', 'Runner-up', 'Out'] as const;
const BPS = 10_000;
const fmt = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BetSheet() {
  const { mode, api, snapshot } = useCasinoBridge();
  const { sheetOpen, hero, stake, set } = useWager();
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const unit = mode === 'demo' ? 'DEMO' : (snapshot?.token.symbol ?? '');
  const table = getBetTable(BET_TYPE.backChicken);
  const denominator = table.classes.reduce((sum, c) => sum + Number(c.weight), 0);

  const max = snapshot
    ? computeMaxWager(snapshot, { maxMultiplierX: maxMultiplierX(BET_TYPE.backChicken) })
    : null;
  const maxStake = max?.kind === 'limit' ? Number(formatUnits(max.maxWager, decimals)) : null;
  const stakeNumber = Number(stake);
  let stakeError: string | null = null;
  if (!(stakeNumber > 0)) stakeError = 'Enter a stake';
  else if (maxStake !== null && stakeNumber > maxStake)
    stakeError = `Max stake right now is ${fmt(maxStake)} ${unit}`;
  else {
    try {
      parseUnits(stake, decimals);
    } catch {
      stakeError = 'Too many decimals';
    }
  }
  const ready = snapshot?.wallet.status === 'ready' && Boolean(api);
  const clampStake = (v: number) => {
    const clamped = maxStake !== null ? Math.min(v, maxStake) : v;
    set({ stake: String(Math.max(0, Math.round(clamped * 100) / 100)) });
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={(open) => set({ sheetOpen: open })}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-2xl rounded-t-2xl border-line bg-ink-2 text-cream"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-3xl text-cream">Back a Bird</SheetTitle>
          <SheetDescription className="text-cream-dim">
            Four bots, one arena. Pick your bird; the chain's VRF decides how the fight ends, and
            you watch it play out.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <fieldset className="grid grid-cols-4 gap-3">
            <legend className="sr-only">Pick a bird</legend>
            {HEROES.map((h) => (
              <label
                key={h}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 bg-ink-3 p-2 transition-[border-color,box-shadow] has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal',
                  h === hero
                    ? 'border-tomato shadow-[0_0_0_3px_rgb(255_90_54/0.35)]'
                    : 'border-line hover:border-cream-dim',
                )}
              >
                <input
                  type="radio"
                  name="back-a-bird-hero"
                  value={h}
                  checked={h === hero}
                  onChange={() => set({ hero: h })}
                  className="sr-only"
                />
                <HeroPortrait hero={h} className="w-16 sm:w-20" />
                <span className="font-pixel text-[11px] uppercase tracking-wider">
                  {HERO_NAMES[h]}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="label-caps text-cream-dim">Stake</span>
              <span className="flex items-center gap-2 rounded-[var(--radius-button)] border-2 border-gold-deep bg-ink px-3">
                <input
                  inputMode="decimal"
                  value={stake}
                  onChange={(e) => set({ stake: e.target.value.replace(/[^0-9.]/g, '') })}
                  className="tabular h-11 w-28 bg-transparent font-bold text-gold outline-none"
                  aria-invalid={Boolean(stakeError)}
                />
                <span className="font-pixel text-xs text-gold/80">{unit}</span>
              </span>
            </label>
            {STAKE_PRESETS.map((p) => (
              <Button key={p.label} size="sm" onClick={() => clampStake(stakeNumber * p.factor)}>
                {p.label}
              </Button>
            ))}
            {maxStake !== null && (
              <Button size="sm" onClick={() => clampStake(maxStake)}>
                Max
              </Button>
            )}
          </div>

          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {table.classes.map((c, i) => {
              const multiplier = Number(c.multiplierBps) / BPS;
              const chance = (Number(c.weight) / denominator) * 100;
              return (
                <li
                  key={c.id}
                  className="rounded-[var(--radius-card)] border-2 border-line bg-ink-3 px-3 py-2"
                >
                  <div className="label-caps text-[11px] text-cream-dim">{CLASS_LABELS[i]}</div>
                  <div className="tabular font-bold text-gold">
                    {multiplier > 0 ? `${multiplier.toFixed(1)}×` : '0×'}
                  </div>
                  <div className="tabular text-xs text-cream-dim">{chance.toFixed(0)}% chance</div>
                </li>
              );
            })}
          </ul>

          <Button
            variant="gold"
            size="lg"
            sound="ui.confirm"
            disabled={!ready || Boolean(stakeError)}
            onClick={() => void placeBackABird(api, decimals)}
          >
            Back {HERO_NAMES[hero]} · win up to{' '}
            {stakeError
              ? '…'
              : `${fmt(stakeNumber * maxMultiplierX(BET_TYPE.backChicken))} ${unit}`}
          </Button>
          <p className="text-center text-xs text-cream-dim" role="status">
            {!ready
              ? 'Connect your wallet on chain.wtf to bet.'
              : (stakeError ??
                `RTP 96% on every bet. ${mode === 'demo' ? 'Demo credits have no value.' : ''}`)}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
