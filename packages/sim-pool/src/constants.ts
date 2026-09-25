/**
 * 8-ball engine constants, SI units throughout (metres, seconds, kilograms, radians/second).
 * Physical values are the measured ones pooltool (Apache-2.0) and the papers use: Han 2005
 * friction, Alciatore TP A-14 throw, Han 2005 cushions. Derived values are computed from these.
 */

/** Fixed step: 2⁻⁹ s. Exact in binary, so time never accumulates rounding. */
export const STEP_S = 1 / 512;
export const GRAVITY_M_S2 = 9.81;

// Balls (WPA: 2¼" diameter, 5½–6 oz).
export const BALL_RADIUS_M = 0.028575;
export const BALL_MASS_KG = 0.17;
/** Solid sphere: I = 2/5·m·R². */
export const BALL_INERTIA = (2 / 5) * BALL_MASS_KG * BALL_RADIUS_M * BALL_RADIUS_M;
export const BALL_COUNT = 16;
export const CUE_BALL = 0;
export const EIGHT_BALL = 8;

// Cloth (Han 2005 / pooltool defaults).
export const MU_SLIDE = 0.2;
export const MU_ROLL = 0.01;
/** Spin (z) friction scales with R: pooltool's `u_sp = (10·2/5/9)·R`. */
export const MU_SPIN_M = ((10 * 2) / 5 / 9) * BALL_RADIUS_M;
/** Linear deceleration while sliding (m/s²) and rolling. */
export const SLIDE_DECEL = MU_SLIDE * GRAVITY_M_S2;
export const ROLL_DECEL = MU_ROLL * GRAVITY_M_S2;
/** Sliding closes contact slip at (7/2)·μs·g: translation (1) + rotation (5/2). */
export const SLIP_CLOSE_RATE = (7 / 2) * SLIDE_DECEL;
/** z-spin decay (rad/s²): 5·u_sp·g / (2R). */
export const SPIN_DECEL = (5 * MU_SPIN_M * GRAVITY_M_S2) / (2 * BALL_RADIUS_M);

// Ball–ball (Alciatore TP A-14): restitution and speed-dependent throw friction a + b·e^(−c·v).
export const BALL_RESTITUTION = 0.95;
export const THROW_FRICTION = { a: 0.01, b: 0.108, c: 1.088 } as const;

// Cushions (Han 2005): nose at 63.5% of ball height; contact angle θ with sinθ = h/R − 1.
export const CUSHION_RESTITUTION = 0.85;
export const CUSHION_FRICTION = 0.2;
export const CUSHION_HEIGHT_M = 0.635 * 2 * BALL_RADIUS_M;
export const CUSHION_SIN = CUSHION_HEIGHT_M / BALL_RADIUS_M - 1;
export const CUSHION_COS = Math.sqrt(1 - CUSHION_SIN * CUSHION_SIN);

// Table (8 ft playing surface, 2:1). Origin at the centre, x along the length.
export const TABLE_LENGTH_M = 2.24;
export const TABLE_WIDTH_M = 1.12;
export const HALF_L = TABLE_LENGTH_M / 2;
export const HALF_W = TABLE_WIDTH_M / 2;
/** Mouth widths between the jaw points (casual-friendly, like online 8-ball). */
export const CORNER_MOUTH_M = 0.118;
export const SIDE_MOUTH_M = 0.13;
/** How far the jaw faces reach back from the cushion nose into the pocket. */
export const JAW_DEPTH_M = 0.045;
/**
 * Throats: the facings narrow from the mouth, so balls driven in at a shallow angle rattle out
 * as on a real table instead of falling through a straight channel.
 */
export const CORNER_THROAT_M = 0.098;
export const SIDE_THROAT_M = 0.11;
/** The head string (break line) sits a quarter of the length from the head rail. */
export const HEAD_STRING_X = -HALF_L / 2;
/** Foot spot, where the rack apex sits. */
export const FOOT_SPOT_X = HALF_L / 2;
/** Rack gap between neighbours: balls touch, plus a hair so the rack isn't pre-compressed. */
export const RACK_GAP_M = 0.00005;
/** Each ball sits up to this much off its ideal spot: no two racks break alike (real racks never do). */
export const RACK_JITTER_M = 0.0001;

// Cue (TP A-12 instantaneous strike).
export const CUE_MASS_KG = 0.54;
export const MAX_CUE_SPEED_M_S = 8;
/** Tip offsets past about half a radius miscue. */
export const MAX_TIP_OFFSET = 0.5;
/** Squirt: the cue ball leaves this far off the aim line per unit of side offset (radians, small). */
export const SQUIRT_PER_OFFSET = 0.035;

// Settling.
/** Below these a ball is at rest (m/s, rad/s). */
export const REST_SPEED_M_S = 0.0005;
export const REST_SPIN_RAD_S = 0.05;
/** Longest shot we simulate before calling everything stopped (60 s of sim time). */
export const MAX_SHOT_STEPS = 60 * 512;
/** Collisions resolved within one step before we stop sub-stepping (guards pathological clusters). */
export const MAX_EVENTS_PER_STEP = 64;
/**
 * Balls closer than this (surface to surface) when an impact happens share it: the whole touching
 * cluster is solved at once, which is how a rack really takes the break (a compression wave, not
 * a chain of separate clicks).
 */
export const CLUSTER_GAP_M = 0.00015;
/** Fixed Gauss–Seidel sweeps for a cluster (deterministic, converges well inside this). */
export const CLUSTER_ITERATIONS = 40;
