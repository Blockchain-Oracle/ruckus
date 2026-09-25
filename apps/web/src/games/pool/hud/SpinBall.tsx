import { useState } from 'react';

import { aim } from '../match/aim.ts';

const SIZE = 88;
const MAX = 0.8;

/** Where the tip meets the cue ball: drag the red dot; double-click/tap to centre it again. */
export function SpinBall({ enabled }: { enabled: boolean }) {
  const [spin, setSpin] = useState({ x: aim.spinX, y: aim.spinY });
  const apply = (el: HTMLElement, cx: number, cy: number) => {
    const r = el.getBoundingClientRect();
    let x = ((cx - r.left) / r.width) * 2 - 1;
    let y = -(((cy - r.top) / r.height) * 2 - 1);
    const l = Math.hypot(x, y);
    if (l > MAX) {
      x = (x / l) * MAX;
      y = (y / l) * MAX;
    }
    aim.spinX = x / MAX;
    aim.spinY = y / MAX;
    setSpin({ x: aim.spinX, y: aim.spinY });
  };
  return (
    <div className="pointer-events-auto absolute bottom-6 left-4 flex flex-col items-center gap-1 sm:left-8">
      <div
        role="slider"
        aria-label="Spin: drag to set where the cue strikes the cue ball"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(spin.y * 100)}
        aria-valuetext={`side ${Math.round(spin.x * 100)}, ${spin.y >= 0 ? 'follow' : 'draw'} ${Math.round(Math.abs(spin.y) * 100)}`}
        tabIndex={enabled ? 0 : -1}
        className="relative touch-none rounded-full shadow-[inset_-8px_-10px_16px_rgb(0_0_0/0.35),0_6px_18px_rgb(0_0_0/0.5)]"
        style={{
          width: SIZE,
          height: SIZE,
          background: 'radial-gradient(circle at 35% 30%, #ffffff, #f2ecd9 55%, #cfc6ad)',
          opacity: enabled ? 1 : 0.4,
        }}
        onPointerDown={(e) => {
          if (!enabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          apply(e.currentTarget, e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons && enabled) apply(e.currentTarget, e.clientX, e.clientY);
        }}
        onDoubleClick={() => {
          aim.spinX = 0;
          aim.spinY = 0;
          setSpin({ x: 0, y: 0 });
        }}
      >
        <span className="absolute inset-[12%] rounded-full border border-dashed border-black/15" />
        <span
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d42a1e] shadow-[0_0_0_2px_rgb(255_255_255/0.8)]"
          style={{ left: `${50 + spin.x * MAX * 50}%`, top: `${50 - spin.y * MAX * 50}%` }}
        />
      </div>
      <span className="font-display text-xs text-cream-dim">SPIN</span>
    </div>
  );
}
