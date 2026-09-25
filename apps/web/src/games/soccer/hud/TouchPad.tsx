import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils.ts';

import { pad } from '../input/keys.ts';

type Key = keyof typeof pad;

/** A hold button: pointer capture keeps it held while a thumb slides a little off it. */
function Hold({
  k,
  label,
  className,
  children,
}: {
  k: Key;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    pad[k] = v;
    setDown(v);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'pointer-events-auto grid touch-none select-none place-items-center rounded-full border-[3px] text-cream transition-[transform,background] duration-[60ms]',
        down ? 'scale-[0.93] border-cream/90 bg-cream/30' : 'border-cream/35 bg-ink/25',
        className,
      )}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

/** Phones: ◀ ▶ under the left thumb, a big JUMP under the right. */
export function TouchPad() {
  useEffect(
    () => () => {
      pad.left = pad.right = pad.jump = false;
    },
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-4 pb-4">
      <div className="flex gap-3">
        <Hold k="left" label="Move left" className="size-[64px]">
          <CaretLeftIcon weight="bold" className="size-9" />
        </Hold>
        <Hold k="right" label="Move right" className="size-[64px]">
          <CaretRightIcon weight="bold" className="size-9" />
        </Hold>
      </div>
      {/* Lifted clear of the jam badge in the bottom-right corner. */}
      <Hold
        k="jump"
        label="Jump"
        className="mb-16 size-[84px] border-tomato/70 bg-tomato/30 font-display text-base"
      >
        JUMP
      </Hold>
    </div>
  );
}
