import type { StadiumLook } from './look/stadium.ts';

/** Visual tuning for the persistent shell. Timings follow the xray.games hub. */

/** Game switch: dark scrim fades in, the scene swaps at full black, then it fades out. */
export const SCRIM_HALF_MS = 200;
export const SCRIM_COLOR = '#140b1c';

/** One attract revolution per ~100 s; slow enough to read as "floating", not "spinning". */
export const ATTRACT_ORBIT_RAD_PER_S = Math.PI * 0.02;
/** The attract framing sits further out than play so the dolly has somewhere to go. */
export const ATTRACT_ZOOM = 1.25;

/** Play dolly: blend attract→play over this long, eased in-out so it launches and lands softly. */
export const DOLLY_S = 1.1;
/** Frame-rate-independent smoothing rate for unwinding the orbit angle back to 0 (1/s). */
export const ORBIT_UNWIND_RATE = 6;

/** DPR ceiling. Retina iPads at DPR 2+ cost 4× the fill for a barely visible gain behind a UI. */
export const DPR_MIN = 1;
export const DPR_MAX = 1.75;
/** Adaptive DPR: average frame time over a window decides a step down or up. */
export const DPR_STEP = 0.25;
export const DPR_WINDOW_FRAMES = 90;
const SLOW_FPS = 50;
const FAST_FPS = 58;
export const FRAME_MS_SLOW = 1000 / SLOW_FPS;
export const FRAME_MS_FAST = 1000 / FAST_FPS;

export const FORCE_WEBGL_PARAM = 'forceWebGL';

/** Look tiers: `?look=high|low|off` pins one for QA. */
export const LOOK_PARAM = 'look';
/** Slow windows already at DPR 1 before dropping a post tier (each window is DPR_WINDOW_FRAMES). */
export const TIER_DOWN_SLOW_WINDOWS = 2;
/** Fast windows at the DPR ceiling before climbing back a tier; slower to rise than to fall. */
export const TIER_UP_FAST_WINDOWS = 3;

/** StadiumPost. Bloom works at a fraction of the buffer: blur hides the resolution. */
export const POST = {
  msaaSamples: 4,
  bloomScaleHigh: 0.5,
  bloomScaleLow: 0.25,
  /** Vignette ramps from this radius (0 centre, 1 edge midpoints, ~1.41 corners) to the next. */
  vignetteInner: 0.6,
  vignetteOuter: 1.45,
  /** A hit flash tints the centre this much of the edges, so the action stays readable. */
  flashCentre: 0.3,
  flashDecayPerS: 6,
  flashFloor: 0.004,
} as const;

/** The arcade room behind the hub: the cabinet screens are the only thing that should glow. */
export const WELCOME_LOOK = {
  background: '#1b1024',
  fog: { color: '#1b1024', near: 12, far: 26 },
  hemisphere: { sky: '#fff1d6', ground: '#24163a', intensity: 1.1 },
  key: {
    kind: 'spot',
    position: [0, 8, 4],
    color: '#fff1d6',
    intensity: 220,
    angle: 0.7,
    penumbra: 0.8,
    distance: 0,
    decay: 2,
  },
  fills: [{ kind: 'directional', position: [-6, 5, -6], color: '#2ec4b6', intensity: 1.6 }],
  toneMapping: 'neutral',
  exposure: 1,
  post: {
    bloom: { strength: 0.6, radius: 0.5, threshold: 0.85 },
    vignette: 0.45,
    saturation: 1.08,
  },
} as const satisfies StadiumLook;
