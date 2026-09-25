import type { ButtonHTMLAttributes } from 'react';

import { uiSound } from '@/lib/audio/index.ts';
import { cn } from '@/lib/utils.ts';

/**
 * The brand's signature control, adapted from 21st.dev "Pop Button" (tom_ui): a thick lip under the
 * face that collapses as the button travels down, so every press is felt. Gold is money-only.
 */
const VARIANTS = {
  gold: 'bg-gold text-ink [--lip-color:var(--gold-deep)]',
  teal: 'bg-teal text-ink [--lip-color:var(--teal-deep)]',
  tomato: 'bg-tomato text-cream [--lip-color:var(--tomato-deep)]',
  ink: 'bg-ink-3 text-cream border-2 border-line [--lip-color:#120a19]',
} as const;

const SIZES = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-16 px-10 text-2xl',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Sprite name for the press sound; UI presses always make a sound (Art Bible). */
  sound?: string;
};

export function Button({
  variant = 'ink',
  size = 'md',
  sound = 'ui.click',
  className,
  onPointerDown,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        'font-display label-caps inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)]',
        'shadow-[0_var(--lip)_0_var(--lip-color),0_10px_18px_rgb(0_0_0/0.35)] transition-[transform,box-shadow] duration-[var(--press-ms)] ease-out',
        'hover:-translate-y-0.5 active:translate-y-[5px] active:shadow-[0_1px_0_var(--lip-color),0_2px_6px_rgb(0_0_0/0.35)]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      onPointerDown={(e) => {
        uiSound(sound);
        onPointerDown?.(e);
      }}
      {...rest}
    />
  );
}
