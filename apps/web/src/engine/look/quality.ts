import { create } from 'zustand';

import { LOOK_PARAM, TIER_DOWN_SLOW_WINDOWS, TIER_UP_FAST_WINDOWS } from '../config.ts';

/**
 * How much post a device gets. high: MSAA + ½-res bloom + shadows. low: no MSAA, ¼-res bloom, no
 * shadows. off: no pipeline (unless the scene needs outlines, which are the character read).
 */
export const TIERS = ['off', 'low', 'high'] as const;
export type Tier = (typeof TIERS)[number];

const isTier = (v: string | null): v is Tier => TIERS.includes(v as Tier);

/** Phones start at low: their fill rate goes to DPR first, and bloom at ¼ res still reads. */
function startTier(): { tier: Tier; forced: boolean } {
  const q = new URLSearchParams(window.location.search).get(LOOK_PARAM);
  if (isTier(q)) return { tier: q, forced: true };
  return { tier: window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high', forced: false };
}

type LookQuality = {
  tier: Tier;
  /** The tier this device started at: stepping back up never passes it. */
  cap: Tier;
  forced: boolean;
  slow: number;
  fast: number;
  /**
   * One AdaptiveDpr window's verdict, reported only when DPR can't move further in that direction.
   * Hysteresis (2 slow / 3 fast windows) because a tier change rebuilds the pipeline's shaders.
   */
  report(verdict: 'slow' | 'fast'): void;
};

const start = startTier();

export const useLookQuality = create<LookQuality>((set, get) => ({
  tier: start.tier,
  cap: start.tier,
  forced: start.forced,
  slow: 0,
  fast: 0,
  report(verdict) {
    const s = get();
    if (s.forced) return;
    const i = TIERS.indexOf(s.tier);
    if (verdict === 'slow') {
      const slow = s.slow + 1;
      if (slow >= TIER_DOWN_SLOW_WINDOWS && i > 0)
        set({ tier: TIERS[i - 1] ?? s.tier, slow: 0, fast: 0 });
      else set({ slow, fast: 0 });
      return;
    }
    const fast = s.fast + 1;
    if (fast >= TIER_UP_FAST_WINDOWS && i < TIERS.indexOf(s.cap))
      set({ tier: TIERS[i + 1] ?? s.tier, slow: 0, fast: 0 });
    else set({ fast, slow: 0 });
  },
}));
