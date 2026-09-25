import { cn } from '@/lib/utils.ts';

/** Bungee wordmark with a stacked tomato-deep extrusion (the cabinet marquee). */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn('font-display text-tomato select-none leading-none', className)}
      style={{
        textShadow:
          '0 1px 0 var(--tomato-deep), 0 2px 0 var(--tomato-deep), 0 3px 0 var(--tomato-deep), 0 4px 0 var(--tomato-deep), 0 8px 14px rgb(0 0 0 / 0.5)',
      }}
    >
      RUCKUS
    </span>
  );
}
