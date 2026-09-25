import { useEffect, useRef, useState } from 'react';

import { aim } from '../match/aim.ts';
import { getDirector } from '../match/runtime.ts';

/** Share of the bar's height the drag must travel for full power. */
const TRACK_SHARE = 0.8;
/** Below this the release is a cancel, not a shot. */
const MIN_SHOT = 0.04;

/**
 * Mobile-8-ball power: grab the cue on the right, pull it down, let go to shoot. The 3D cue draws
 * back in step (it reads `aim.power`). Space does the same on a keyboard.
 */
export function PowerCue({ enabled }: { enabled: boolean }) {
  const [power, setPower] = useState(0);
  const start = useRef<number | null>(null);
  const track = useRef(220);

  useEffect(() => {
    if (!enabled) {
      start.current = null;
      aim.power = 0;
      setPower(0);
    }
  }, [enabled]);

  const release = () => {
    if (start.current === null) return;
    start.current = null;
    // Calling a shot (the wager) keeps the power you set; a normal turn shoots on release.
    if (getDirector()?.mode === 'wager') return;
    if (aim.power >= MIN_SHOT) getDirector()?.shootHuman();
    aim.power = 0;
    setPower(0);
  };

  return (
    <div
      className="pointer-events-auto absolute top-1/2 right-4 flex h-[min(280px,56vh)] w-14 sm:w-16 -translate-y-1/2 touch-none select-none flex-col items-center rounded-full border-2 border-line bg-ink/80 py-3 sm:right-8"
      aria-label="Power: pull down and release to shoot"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(power * 100)}
      tabIndex={enabled ? 0 : -1}
      onPointerDown={(e) => {
        if (!enabled) return;
        start.current = e.clientY;
        track.current = e.currentTarget.getBoundingClientRect().height * TRACK_SHARE;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        const p = Math.max(0, Math.min(1, (e.clientY - start.current) / track.current));
        aim.power = p;
        setPower(p);
      }}
      onPointerUp={release}
      onPointerCancel={() => {
        start.current = null;
        aim.power = 0;
        setPower(0);
      }}
      style={{ opacity: enabled ? 1 : 0.35 }}
    >
      <div className="relative h-full w-3 overflow-hidden rounded-full bg-black/60">
        <div
          className="absolute inset-x-0 top-0 rounded-full"
          style={{
            height: `${power * 100}%`,
            background: 'linear-gradient(180deg, #2ec4b6, #ffc93c 60%, #ff5a36)',
          }}
        />
      </div>
      {/* The grip: a stylised cue butt that slides down with the pull. */}
      <div
        className="absolute left-1/2 h-14 w-7 -translate-x-1/2 rounded-md border-2 border-[#c9b37a] bg-gradient-to-b from-[#3b1d12] to-[#141414] shadow-lg"
        style={{ top: `calc(12px + ${power} * (100% - 88px))` }}
      />
      <span className="absolute -bottom-7 font-display text-xs text-cream-dim">
        {enabled ? 'PULL' : ''}
      </span>
    </div>
  );
}
