import { cn } from '@/lib/utils.ts';

import { BALL_HUES } from '../config.ts';

/** A tiny flat ball for the HUD: solid colour, or white with a band for stripes. */
export function BallChip({
  n,
  gone = false,
  className,
}: {
  n: number;
  gone?: boolean;
  className?: string;
}) {
  const stripe = n >= 9;
  const hue = BALL_HUES[stripe ? n - 8 : n] ?? '#fff';
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-grid size-5 place-items-center rounded-full shadow-[inset_-2px_-3px_4px_rgb(0_0_0/0.35)]',
        gone && 'opacity-20 grayscale',
        className,
      )}
      style={{
        background: stripe
          ? `linear-gradient(180deg, ${BALL_HUES[0]} 0 28%, ${hue} 28% 72%, ${BALL_HUES[0]} 72%)`
          : hue,
      }}
    >
      <span className="grid size-2.5 place-items-center rounded-full bg-[#fbf7ec] text-[7px] font-bold leading-none text-[#141414]">
        {n}
      </span>
    </span>
  );
}
