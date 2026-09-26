import { formatUnits } from 'viem';

import { useT } from '@/i18n/index.ts';
import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

const DISPLAY_DECIMALS = 2;
const fmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: DISPLAY_DECIMALS,
  maximumFractionDigits: DISPLAY_DECIMALS,
});

/** Money is always gold and always carries its unit. Demo mode says so, every time. */
export function BalancePill() {
  const t = useT();
  const { mode, snapshot } = useCasinoBridge();
  const decimals = snapshot?.token.decimals;
  const balance = snapshot?.balances.smartVaultBalance;

  if (mode === 'connecting' || decimals === undefined || balance === undefined) {
    return (
      <span className="rounded-full border-2 border-line px-4 py-1.5 text-sm text-cream-dim">
        {t('balance.connecting')}
      </span>
    );
  }

  const amount = fmt.format(Number(formatUnits(BigInt(balance), decimals)));
  const unit = mode === 'demo' ? t('balance.demo') : (snapshot?.token.symbol ?? '');
  return (
    <span
      className="tabular inline-flex items-center gap-2 rounded-full border-2 border-gold-deep bg-ink-2 px-4 py-1.5 font-bold text-gold max-[380px]:gap-1.5 max-[380px]:px-3"
      title={mode === 'demo' ? t('balance.demoNote') : undefined}
    >
      {amount}
      <span className="font-pixel text-xs text-gold/80">{unit}</span>
    </span>
  );
}
