/** Mix and dynamics tuning. */

export const BUSES = ['music', 'sfx', 'ui'] as const;
export type Bus = (typeof BUSES)[number];

/** Safety limiter on master: catches stacked explosions before they clip. */
export const LIMITER = {
  thresholdDb: -6,
  kneeDb: 0,
  ratio: 16,
  attackS: 0.003,
  releaseS: 0.25,
} as const;

/** Ducking dips music under stingers and reveals. setTargetAtTime uses a time constant ≈ ramp/3. */
export const DUCK = {
  attackS: 0.035,
  releaseS: 0.45,
  defaultDb: -8,
  /** Before a casino reveal the bed drops almost to silence; silence is the best suspense. */
  revealDb: -30,
} as const;
export const TIME_CONSTANT_PER_RAMP = 1 / 3;

/** Variation: every repeat is slightly different so nothing sounds machine-gunned. */
export const VARIATION = {
  detuneCents: 80,
  gainDb: 1.5,
} as const;
/** Per-sound polyphony cap and same-sound cooldown. */
export const MAX_VOICES_PER_SOUND = 5;
export const SAME_SOUND_COOLDOWN_S = 0.035;

/** Master volume change glide, so sliders never zipper. */
export const GAIN_GLIDE_S = 0.03;

export const dbToGain = (db: number) => 10 ** (db / 20);
