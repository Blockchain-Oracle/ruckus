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

/** Longest the scrim waits for a new game's scene to load and compile before revealing anyway. */
export const STAGE_WARM_MAX_MS = 3000;
