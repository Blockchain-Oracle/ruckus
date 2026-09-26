/**
 * 3-lane runner rules and numbers, from DAG Dasher (KaspaKinesis).
 * Units are world units ("metres") and seconds. `s` is distance along the course (forward),
 * `y` is height above the track, lanes are 0 (left) · 1 · 2 (right).
 */

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

// Track.
export const LANES = 3;
export const LANE_WIDTH_M = 2.5;
export const START_LANE = 1;

// Runner body and jump (v₀ 12, g 30: 2.4 m apex, 0.8 s airtime).
export const RUNNER_HEIGHT_M = 1;
export const DUCK_HEIGHT_M = 0.3;
export const JUMP_SPEED_MPS = 12;
export const GRAVITY_MPS2 = 30;
/** Duck in the air slams you down at this speed (Subway-style), instead of KK's ignored input. */
export const SLAM_SPEED_MPS = 24;
/** A jump pressed this close to landing still fires on touchdown; off a ledge it still fires. */
export const JUMP_BUFFER_S = 0.12;
export const COYOTE_S = 0.1;

// Speed: ramps with your own distance, 15 → 40 m/s over the course.
export const BASE_SPEED_MPS = 15;
export const TOP_SPEED_MPS = 40;
/** Course length: about 118 s for a clean run (∫ ds / speed(s) = L/Δv · ln(top/base)). */
export const COURSE_M = 3000;

/**
 * Coin momentum (Mario Kart's coins): every coin you carry adds 1% speed, up to 10 coins. It makes
 * coins count in a race to the line, and a hit costs you twice (the coin and the stumble).
 */
export const MOMENTUM_PER_COIN = 0.01;
export const MOMENTUM_MAX_COINS = 10;

// Hits.
export const HIT_SLOW = 0.5;
export const HIT_SLOW_S = 1.5;
export const INVULNERABLE_S = 1;
/** Barriers, coins and pickups count while they are this close along the course. */
export const REACH_M = 1.5;
/** Coins and pickups: height tolerance around the runner's middle. */
export const COLLECT_RADIUS_M = 0.8;

// Coins are life: a hit costs one coin's worth; a hit you can't pay for is a wipeout.
export const COIN_VALUE = 10;
export const HIT_COST = COIN_VALUE;
/** KK started at 0, so the first hit ended the run. Two free hits make the opening fair. */
export const START_COINS = 2 * HIT_COST;

// Course generation.
/** The first spawn sits this far out (KK's spawn distance), so the countdown has an empty road. */
export const FIRST_SPAWN_M = 60;
/**
 * Spawns come one every 1.1 s at the base speed for that stretch, never closer than 15 m. KK used
 * 1.5 s, which its own comment calls "easy mode"; a two-minute race needs a busier road.
 */
export const SPAWN_EVERY_S = 1.1;
export const MIN_GAP_M = 15;
/** Nothing spawns in the last stretch, so the finish line reads clean. */
export const FINISH_CLEAR_M = 40;
/** KK's spawn roll: barrier · platform · coin line · pickup, the rest is breathing room. */
export const SPAWN_ODDS = { barrier: 0.3, platform: 0.1, coins: 0.35, pickup: 0.15 } as const;
export const COIN_LINE = { min: 1, max: 5, gapM: 3 } as const;
/** Ground coins float at 0.5 m; air coins at 2–2.5 m need a jump. */
export const COIN_GROUND_Y = 0.5;
export const PICKUP_GROUND_Y = 1;
export const AIR_ITEM_Y = { min: 2, spread: 0.5 } as const;
/** Items on a platform float this far above it (higher on the long runways, so you jump again). */
export const ON_PLATFORM_FLOAT = { short: 0.8, long: 2 } as const;
export const LONG_PLATFORM_M = 10;
/** Running into a platform steps you onto it; its edges are this forgiving. */
export const PLATFORM_EDGE_M = 0.5;

// Pickups (KK durations and sizes).
export const SPEED_BOOST = 1.5;
export const SLOW_DOWN = 0.6;
export const MAGNET_RANGE_M = 5;

// Race flow.
export const COUNTDOWN_S = 3;
/** Past the line a runner eases to a stop over this long (then celebrates). */
export const COAST_S = 2;
/** After the first runner finishes, everyone else has this long to cross. */
export const FINISH_GRACE_S = 12;
export const MAX_RUNNERS = 4;
