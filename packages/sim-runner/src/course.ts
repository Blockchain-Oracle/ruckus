import {
  AIR_ITEM_Y,
  BASE_SPEED_MPS,
  COIN_GROUND_Y,
  COIN_LINE,
  COURSE_M,
  FINISH_CLEAR_M,
  FIRST_SPAWN_M,
  LONG_PLATFORM_M,
  MIN_GAP_M,
  ON_PLATFORM_FLOAT,
  PICKUP_GROUND_Y,
  SPAWN_EVERY_S,
  SPAWN_ODDS,
  TOP_SPEED_MPS,
} from './constants.ts';

/**
 * The barrier grammar: colour is the verb. Cyan = jump, yellow = duck, red = move (unjumpable),
 * purple = strict duck (too tall to jump). `lanes` is a bitmask (1 = left, 2 = centre, 4 = right);
 * `minY`/`maxY` is the band a runner's body must stay out of.
 */
export const BARRIERS = {
  jumpSingle: { verb: 'jump', lanes: 0b010, minY: 0, maxY: 1.5 },
  duckSingle: { verb: 'duck', lanes: 0b010, minY: 0.5, maxY: 1.5 },
  moveSingle: { verb: 'move', lanes: 0b010, minY: 0, maxY: 10 },
  jumpDouble: { verb: 'jump', lanes: 0b011, minY: 0, maxY: 1.5 },
  duckDouble: { verb: 'duck', lanes: 0b110, minY: 0.5, maxY: 1.5 },
  wallDouble: { verb: 'move', lanes: 0b101, minY: 0, maxY: 10 },
  jumpFull: { verb: 'jump', lanes: 0b111, minY: 0, maxY: 1.5 },
  duckFull: { verb: 'duck', lanes: 0b111, minY: 0.5, maxY: 1.5 },
  duckStrict: { verb: 'strict', lanes: 0b111, minY: 0.4, maxY: 2.6 },
} as const satisfies Record<
  string,
  { verb: 'jump' | 'duck' | 'move' | 'strict'; lanes: number; minY: number; maxY: number }
>;
export type BarrierId = keyof typeof BARRIERS;
export const BARRIER_IDS = Object.keys(BARRIERS) as BarrierId[];

/** Platforms you run onto (KK's four sizes and colours). */
export const PLATFORMS = {
  cube: { lengthM: 3, heightM: 1.2 },
  long: { lengthM: 6, heightM: 1 },
  extended: { lengthM: 12, heightM: 1 },
  mega: { lengthM: 18, heightM: 1.2 },
} as const satisfies Record<string, { lengthM: number; heightM: number }>;
export type PlatformId = keyof typeof PLATFORMS;
export const PLATFORM_IDS = Object.keys(PLATFORMS) as PlatformId[];

/** Mystery pickups: four buffs, three debuffs, drawn uniformly (so 4/7 are good). */
export const PICKUPS = {
  speed: { good: true, seconds: 5 },
  magnet: { good: true, seconds: 8 },
  shield: { good: true, seconds: 6 },
  double: { good: true, seconds: 5 },
  slow: { good: false, seconds: 4 },
  reverse: { good: false, seconds: 3 },
  fog: { good: false, seconds: 5 },
} as const satisfies Record<string, { good: boolean; seconds: number }>;
export type PickupId = keyof typeof PICKUPS;
export const PICKUP_IDS = Object.keys(PICKUPS) as PickupId[];

export type Entity =
  | { kind: 'barrier'; s: number; barrier: BarrierId; lanes: number }
  | { kind: 'platform'; s: number; lane: number; platform: PlatformId; lengthM: number; y: number }
  | { kind: 'coin'; s: number; lane: number; y: number }
  | { kind: 'pickup'; s: number; lane: number; y: number; pickup: PickupId };

/** The base speed on a stretch of road, before hits and pickups. */
export const baseSpeedAt = (s: number) =>
  BASE_SPEED_MPS + (TOP_SPEED_MPS - BASE_SPEED_MPS) * (s >= COURSE_M ? 1 : s / COURSE_M);

/** mulberry32 over a local state: the course has its own stream, apart from the bots'. */
function stream(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(list: readonly T[], r: number) => list[Math.floor(r * list.length)] as T;
const airY = (r: number) => AIR_ITEM_Y.min + AIR_ITEM_Y.spread * r;

/**
 * The whole course for a seed, sorted by `s`. Spawns follow KK's roll and rhythm, keyed to
 * distance instead of wall time so every runner (and every replay) meets the same road.
 */
export function buildCourse(seed: number): Entity[] {
  const rand = stream(seed);
  const out: Entity[] = [];
  let s = FIRST_SPAWN_M;
  while (s < COURSE_M - FINISH_CLEAR_M) {
    const roll = rand();
    let used = 0;
    if (roll < SPAWN_ODDS.barrier) {
      const barrier = pick(BARRIER_IDS, rand());
      let lanes: number = BARRIERS[barrier].lanes;
      if (lanes !== 0b111) {
        // KK rotates the template left, right or not at all.
        const turn = rand();
        if (turn < 0.33) lanes = ((lanes << 1) | (lanes >> 2)) & 0b111;
        else if (turn < 0.66) lanes = ((lanes >> 1) | (lanes << 2)) & 0b111;
      }
      out.push({ kind: 'barrier', s, barrier, lanes });
    } else if (roll < SPAWN_ODDS.barrier + SPAWN_ODDS.platform) {
      used = platform(out, s, rand);
    } else if (roll < SPAWN_ODDS.barrier + SPAWN_ODDS.platform + SPAWN_ODDS.coins) {
      const lane = Math.floor(rand() * 3);
      const h = rand();
      const y = h < 0.5 ? COIN_GROUND_Y : airY(h);
      const count = COIN_LINE.min + Math.floor(rand() * (COIN_LINE.max - COIN_LINE.min + 1));
      for (let i = 0; i < count; i++)
        out.push({ kind: 'coin', s: s + i * COIN_LINE.gapM, lane, y });
      used = (count - 1) * COIN_LINE.gapM;
    } else if (
      roll <
      SPAWN_ODDS.barrier + SPAWN_ODDS.platform + SPAWN_ODDS.coins + SPAWN_ODDS.pickup
    ) {
      const lane = Math.floor(rand() * 3);
      const pickup = pick(PICKUP_IDS, rand());
      const h = rand();
      out.push({ kind: 'pickup', s, lane, y: h < 0.5 ? PICKUP_GROUND_Y : airY(h), pickup });
    }
    s += used + Math.max(MIN_GAP_M, baseSpeedAt(s) * SPAWN_EVERY_S);
  }
  out.sort((a, b) => a.s - b.s);
  return out;
}

/** A platform plus what floats over it (KK: 60% a coin run, 30% a pickup, 10% bare). */
function platform(out: Entity[], s: number, rand: () => number) {
  const lane = Math.floor(rand() * 3);
  const id = pick(PLATFORM_IDS, rand());
  const { lengthM, heightM } = PLATFORMS[id];
  out.push({ kind: 'platform', s, lane, platform: id, lengthM, y: heightM });
  const long = lengthM >= LONG_PLATFORM_M;
  const y = heightM + (long ? ON_PLATFORM_FLOAT.long : ON_PLATFORM_FLOAT.short);
  const what = rand();
  if (what < 0.6) {
    const count = (long ? 3 : 1) + Math.floor(rand() * (long ? 4 : 3));
    const spacing = lengthM / (count + 1);
    for (let i = 0; i < count; i++) out.push({ kind: 'coin', s: s + spacing * (i + 1), lane, y });
  } else if (what < 0.9) {
    out.push({ kind: 'pickup', s: s + lengthM / 2, lane, y, pickup: pick(PICKUP_IDS, rand()) });
  }
  return lengthM;
}

export const laneBlocked = (lanes: number, lane: number) => (lanes & (1 << lane)) !== 0;
