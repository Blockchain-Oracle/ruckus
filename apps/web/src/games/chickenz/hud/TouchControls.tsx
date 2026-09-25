import { CrosshairIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils.ts';

import { JOYSTICK } from '../input/touch.ts';
import { touch } from '../match/runtime.ts';

const COARSE = '(pointer: coarse)';
const ARC_HALF_WIDTH = 0.55;
const ARC_INSET = 8;

/** Only phones and tablets get sticks; a mouse player keeps a clean screen. */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(COARSE).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(COARSE);
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}

export function TouchControls() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const [shooting, setShooting] = useState(false);

  useEffect(() => {
    touch.active = true;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current;
      const ctx = c?.getContext('2d');
      if (!c || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = JOYSTICK.baseInset;
      const cy = h - JOYSTICK.baseInset;
      const r = JOYSTICK.radius;
      const shaking = touch.shaking > 0;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = shaking ? 'rgba(255,150,0,0.12)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = shaking ? 'rgba(255,180,0,0.8)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = shaking ? 3.5 : 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * JOYSTICK.deadZone * 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const dist = Math.hypot(touch.knobX, touch.knobY);
      if (touch.joystick && dist / r > JOYSTICK.deadZone) {
        const angle = Math.atan2(touch.knobY, touch.knobX);
        ctx.beginPath();
        ctx.arc(cx, cy, r - ARC_INSET, angle - ARC_HALF_WIDTH, angle + ARC_HALF_WIDTH);
        ctx.strokeStyle = 'rgba(255,255,100,0.35)';
        ctx.lineWidth = 8;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx + touch.knobX, cy + touch.knobY, JOYSTICK.knobRadius, 0, Math.PI * 2);
      ctx.fillStyle = touch.joystick ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = touch.joystick ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = touch.joystick ? 2.5 : 2;
      ctx.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      touch.active = false;
      touch.shoot = false;
      touch.end(performance.now());
    };
  }, []);

  const local = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - JOYSTICK.baseInset,
      y: e.clientY - rect.top - (rect.height - JOYSTICK.baseInset),
    };
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%]">
      <canvas
        ref={canvas}
        className="pointer-events-auto absolute bottom-0 left-0 h-full w-[55%] touch-none"
        onPointerDown={(e) => {
          if (pointer.current !== null) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          touch.begin(performance.now());
          const p = local(e);
          touch.move(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== pointer.current) return;
          const p = local(e);
          touch.move(p.x, p.y);
        }}
        onPointerUp={(e) => {
          if (e.pointerId !== pointer.current) return;
          pointer.current = null;
          touch.end(performance.now());
        }}
        onPointerCancel={(e) => {
          if (e.pointerId !== pointer.current) return;
          pointer.current = null;
          touch.end(performance.now());
        }}
      />
      <button
        type="button"
        aria-label="Shoot"
        className={cn(
          'pointer-events-auto absolute right-9 bottom-[104px] grid size-[90px] touch-none place-items-center rounded-full border-[3px] text-white/75 transition-[transform,background] duration-[60ms]',
          shooting
            ? 'scale-[0.93] border-[rgba(255,120,120,0.95)] bg-[rgba(255,50,50,0.65)]'
            : 'border-[rgba(255,50,50,0.55)] bg-[rgba(255,50,50,0.25)]',
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          touch.shoot = true;
          setShooting(true);
        }}
        onPointerUp={() => {
          touch.shoot = false;
          setShooting(false);
        }}
        onPointerCancel={() => {
          touch.shoot = false;
          setShooting(false);
        }}
      >
        <CrosshairIcon weight="bold" className="size-9" />
      </button>
    </div>
  );
}
