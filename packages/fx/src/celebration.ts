/**
 * Payout tiers (research §5, Act 4). Shared by every game's wager so a 3× feels the same in pool and
 * Chickenz. Visual/audio cue names are looked up by each game's presenter.
 */
export type CelebrationTier = 'loss' | 'small' | 'win' | 'big' | 'jackpot';

type TierSpec = {
  /** Lower bound on the payout multiplier (inclusive). */
  minMultiplier: number;
  countUpS: number;
  trauma: number;
  hitStopMs: number;
  particles: number;
  slowMo: number;
  /** ms pattern for navigator.vibrate. */
  haptic: readonly number[];
  /** Duck the music under the stinger. */
  duckDb: number;
};

export const CELEBRATION_TIERS = {
  loss: {
    minMultiplier: 0,
    countUpS: 0,
    trauma: 0,
    hitStopMs: 0,
    particles: 0,
    slowMo: 1,
    haptic: [],
    duckDb: 0,
  },
  small: {
    minMultiplier: 0.0001,
    countUpS: 0.5,
    trauma: 0,
    hitStopMs: 0,
    particles: 8,
    slowMo: 1,
    haptic: [10],
    duckDb: -4,
  },
  win: {
    minMultiplier: 1.5,
    countUpS: 1.2,
    trauma: 0.3,
    hitStopMs: 0,
    particles: 30,
    slowMo: 1,
    haptic: [20, 30, 40],
    duckDb: -8,
  },
  big: {
    minMultiplier: 5,
    countUpS: 2,
    trauma: 0.6,
    hitStopMs: 120,
    particles: 80,
    slowMo: 0.35,
    haptic: [30, 40, 30, 40, 120],
    duckDb: -14,
  },
  jackpot: {
    minMultiplier: 25,
    countUpS: 3,
    trauma: 0.9,
    hitStopMs: 250,
    particles: 160,
    slowMo: 0.25,
    haptic: [40, 30, 40, 30, 200],
    duckDb: -24,
  },
} as const satisfies Record<CelebrationTier, TierSpec>;

const ORDER = [
  'jackpot',
  'big',
  'win',
  'small',
  'loss',
] as const satisfies readonly CelebrationTier[];

export function tierFor(multiplier: number): CelebrationTier {
  return ORDER.find((t) => multiplier >= CELEBRATION_TIERS[t].minMultiplier) ?? 'loss';
}

/** easeOutExpo on the value: fast at first, then it "lands" — the classic count-up feel. */
export const countUpValue = (from: number, to: number, t: number) =>
  from + (to - from) * (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
