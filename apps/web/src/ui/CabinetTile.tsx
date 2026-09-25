import { UsersThreeIcon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils.ts';

type Props = {
  title: string;
  tagline: string;
  players: string;
  active: boolean;
  onSelect(): void;
  onIntent(): void;
};

/** A cabinet tile: ink-3 face and 2 px line; the active one gets a tomato border and halo. */
export function CabinetTile({ title, tagline, players, active, onSelect, onIntent }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      className={cn(
        'group flex w-56 shrink-0 flex-col gap-1.5 rounded-[var(--radius-card)] border-2 bg-ink-3 p-4 text-left transition-[border-color,box-shadow,transform] duration-200',
        active
          ? 'border-tomato shadow-[0_0_0_3px_rgb(255_90_54/0.35)]'
          : 'border-line hover:-translate-y-0.5 hover:border-cream-dim',
      )}
    >
      <span className="font-display text-xl text-cream">{title}</span>
      <span className="text-sm leading-snug text-cream-dim [@media(max-height:480px)]:hidden">
        {tagline}
      </span>
      <span className="font-pixel label-caps mt-1 inline-flex items-center gap-1.5 text-xs text-teal">
        <UsersThreeIcon weight="bold" className="size-3.5" />
        {players}
      </span>
    </button>
  );
}
