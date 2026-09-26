/**
 * The top banner of a VRF round: its name, and under it the demo disclosure or the RTP. Two lines
 * on purpose, so "DEMO CREDITS, NO VALUE" stays readable (and inside its pill) on a 320 px phone.
 */
export function RoundBanner({ title, demo }: { title: string; demo: boolean }) {
  return (
    <div className="flex max-w-full flex-col items-center rounded-2xl border-2 border-gold-deep bg-ink/85 px-4 py-1 text-center leading-tight">
      <span className="font-display text-sm text-gold">{title}</span>
      <span className="font-pixel text-[10px] tracking-wider text-gold/80 uppercase">
        {demo ? 'Demo credits, no value' : 'RTP 96% on every call'}
      </span>
    </div>
  );
}
