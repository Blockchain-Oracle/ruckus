import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils.ts';

import { STICK } from '../config.ts';
import { pad } from '../input/keys.ts';

type Knob = { ox: number; oy: number; dx: number; dy: number } | null;

const release = () => {
  pad.left = pad.right = pad.stickJump = false;
};

/** Sideways past the dead zone runs; up past the jump line jumps (diagonal = run and jump). */
function steer(dx: number, dy: number) {
  const dead = STICK.radius * STICK.deadZone;
  pad.left = dx < -dead;
  pad.right = dx > dead;
  pad.stickJump = dy < -STICK.radius * STICK.jumpLine;
}

/**
 * Phones: a floating thumbstick on the left half (it appears wherever the thumb lands), and a big
 * JUMP under the right thumb for players who'd rather tap than flick up.
 */
export function TouchPad() {
  const [knob, setKnob] = useState<Knob>(null);
  const pointer = useRef<number | null>(null);
  const [jumping, setJumping] = useState(false);

  useEffect(
    () => () => {
      release();
      pad.jump = false;
    },
    [],
  );

  const local = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, rect };
  };

  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== pointer.current) return;
    pointer.current = null;
    release();
    setKnob(null);
  };

  // Idle, the ring waits bottom-left (anchored by CSS, no measuring); a touch moves it under the thumb.
  const ring = knob
    ? { left: knob.ox - STICK.radius, top: knob.oy - STICK.radius }
    : { left: STICK.restInset - STICK.radius, bottom: STICK.restInset - STICK.radius };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]">
      <div
        role="application"
        aria-label="Movement stick: slide to run, flick up to jump"
        className="pointer-events-auto absolute inset-y-0 left-0 w-[55%] touch-none select-none"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (pointer.current !== null) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          // Keep the whole ring on screen even when the thumb lands at the very edge.
          const { x, y, rect } = local(e);
          const ox = Math.min(Math.max(x, STICK.radius), rect.width - STICK.radius);
          const oy = Math.min(Math.max(y, STICK.radius), rect.height - STICK.radius);
          setKnob({ ox, oy, dx: 0, dy: 0 });
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== pointer.current || !knob) return;
          const { x, y } = local(e);
          let dx = x - knob.ox;
          let dy = y - knob.oy;
          const dist = Math.hypot(dx, dy);
          if (dist > STICK.radius) {
            dx = (dx / dist) * STICK.radius;
            dy = (dy / dist) * STICK.radius;
          }
          steer(dx, dy);
          setKnob({ ...knob, dx, dy });
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {
          <div
            aria-hidden
            className={cn(
              'absolute rounded-full border-[3px] transition-opacity duration-150',
              knob
                ? 'border-cream/45 bg-ink/30 opacity-100'
                : 'border-cream/25 bg-ink/15 opacity-70',
            )}
            style={{ width: STICK.radius * 2, height: STICK.radius * 2, ...ring }}
          >
            <div
              className={cn(
                'absolute rounded-full border-2',
                knob ? 'border-cream/80 bg-cream/35' : 'border-cream/40 bg-cream/15',
              )}
              style={{
                width: STICK.knob * 2,
                height: STICK.knob * 2,
                left: STICK.radius - STICK.knob - 3 + (knob?.dx ?? 0),
                top: STICK.radius - STICK.knob - 3 + (knob?.dy ?? 0),
              }}
            />
          </div>
        }
      </div>
      {/* Lifted clear of the jam badge in the bottom-right corner. */}
      <button
        type="button"
        aria-label="Jump"
        className={cn(
          'pointer-events-auto absolute right-4 bottom-20 grid size-[84px] touch-none select-none place-items-center rounded-full border-[3px] font-display text-base text-cream transition-[transform,background] duration-[60ms]',
          jumping ? 'scale-[0.93] border-cream/90 bg-cream/30' : 'border-tomato/70 bg-tomato/30',
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pad.jump = true;
          setJumping(true);
        }}
        onPointerUp={() => {
          pad.jump = false;
          setJumping(false);
        }}
        onPointerCancel={() => {
          pad.jump = false;
          setJumping(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        JUMP
      </button>
    </div>
  );
}
