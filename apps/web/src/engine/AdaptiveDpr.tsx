import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

import {
  DPR_MAX,
  DPR_MIN,
  DPR_STEP,
  DPR_WINDOW_FRAMES,
  FRAME_MS_FAST,
  FRAME_MS_SLOW,
} from './config.ts';
import { useLookQuality } from './look/quality.ts';

export const dprCeiling = () => Math.min(window.devicePixelRatio || 1, DPR_MAX);

/**
 * Runtime GPU-tier detection: instead of a benchmark lookup table (a network fetch before first
 * frame), measure what this device actually sustains and step DPR down or back up.
 */
export function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ ms: 0, frames: 0, dpr: dprCeiling() });

  useFrame((_, delta) => {
    const a = acc.current;
    a.ms += delta * 1000;
    a.frames += 1;
    if (a.frames < DPR_WINDOW_FRAMES) return;
    const avg = a.ms / a.frames;
    a.ms = 0;
    a.frames = 0;
    const ceiling = dprCeiling();
    // DPR is the first lever; post tiers move only once DPR is pinned at its end.
    if (avg > FRAME_MS_SLOW && a.dpr <= DPR_MIN) useLookQuality.getState().report('slow');
    else if (avg < FRAME_MS_FAST && a.dpr >= ceiling) useLookQuality.getState().report('fast');
    const next =
      avg > FRAME_MS_SLOW
        ? Math.max(DPR_MIN, a.dpr - DPR_STEP)
        : avg < FRAME_MS_FAST
          ? Math.min(ceiling, a.dpr + DPR_STEP)
          : a.dpr;
    if (next !== a.dpr) {
      a.dpr = next;
      setDpr(next);
    }
  });
  return null;
}
