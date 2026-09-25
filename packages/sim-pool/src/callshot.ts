import { BALL_RADIUS_M, CUE_BALL, HALF_L, HALF_W } from './constants.ts';
import type { Shot } from './cue.ts';
import { PoolSim, type ShotEvent } from './engine.ts';
import { prng } from './math.ts';
import { at, type Balls, F, newBalls, ON_TABLE, onTable, set } from './state.ts';
import { POCKETS } from './table.ts';

/**
 * "Call Your Shot" presentation (the wager's physics side). The contract decides make or miss; this
 * finds a stroke within a hair of the player's own (their aim, power and spin, plus a seeded
 * tremor) that produces exactly that result on the real engine. Deterministic in its inputs, so a
 * round replays identically anywhere.
 */

const R = BALL_RADIUS_M;
/** Where an object ball crosses into each pocket (the mouth centre on the cushion line). */
const CORNER_IN = 0.042;
export const POCKET_MOUTHS = POCKETS.map((p, i) =>
  i < 4
    ? { x: p.x - Math.sign(p.x) * CORNER_IN, y: p.y - Math.sign(p.y) * CORNER_IN }
    : { x: p.x, y: p.y },
);

/** Difficulty tiers, easiest first; tier index + 1 is the contract's bet type. */
export const TIERS = ['straight', 'cut', 'thin', 'long'] as const;
export type Tier = (typeof TIERS)[number];
/** Tier boundaries: cut angle (cos) and total travel (m). */
const STRAIGHT_COS = 0.978; // < 12°
const CUT_COS = 0.819; //       < 35°
const THIN_COS = 0.5; //        < 60°
const SHORT_TRAVEL_M = 1.2;
const LONG_TRAVEL_M = 2.1;
/** The object ball must be heading within this of a pocket's mouth to call it. */
const POCKET_CONE_COS = 0.992;

export type Call = {
  ball: number;
  pocket: number;
  tier: Tier;
  /** Cut (cosine of the cut angle, 1 = straight) and total travel (cue→contact + object→pocket). */
  cut: number;
  travelM: number;
};

/** A practice layout: `count` object balls scattered clear of each other, the pockets and the cue ball. */
export function layout(seed: number, count = 6): Balls {
  const b = newBalls();
  for (let i = 0; i < 16; i++) set(b, i, F.pocket, 0);
  const rand = prng(seed);
  const placed: { x: number; y: number }[] = [];
  const free = (x: number, y: number) =>
    placed.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > (4 * R) ** 2) &&
    POCKETS.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > 0.15 ** 2);
  const spot = () => {
    for (let k = 0; k < 200; k++) {
      const x = (rand() * 2 - 1) * (HALF_L - 3 * R);
      const y = (rand() * 2 - 1) * (HALF_W - 3 * R);
      if (free(x, y)) return { x, y };
    }
    return { x: 0, y: 0 };
  };
  const balls = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 8];
  for (let k = balls.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [balls[k], balls[j]] = [balls[j] as number, balls[k] as number];
  }
  for (const ball of [CUE_BALL, ...balls.slice(0, count)]) {
    const p = spot();
    placed.push(p);
    set(b, ball, F.pocket, ON_TABLE);
    set(b, ball, F.x, p.x);
    set(b, ball, F.y, p.y);
  }
  return b;
}

/** What the current aim calls: the first ball the cue ball meets and the pocket it's sent at. */
export function readCall(b: Balls, dx: number, dy: number): Call | null {
  const l = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / l;
  const uy = dy / l;
  const cx = at(b, CUE_BALL, F.x);
  const cy = at(b, CUE_BALL, F.y);
  let best = Number.POSITIVE_INFINITY;
  let ball = -1;
  for (let i = 1; i < 16; i++) {
    if (!onTable(b, i)) continue;
    const px = at(b, i, F.x) - cx;
    const py = at(b, i, F.y) - cy;
    const along = px * ux + py * uy;
    if (along <= 0) continue;
    const reach = 4 * R * R - (px * px + py * py - along * along);
    if (reach < 0) continue;
    const t = along - Math.sqrt(reach);
    if (t < best) {
      best = t;
      ball = i;
    }
  }
  if (ball < 0) return null;
  const gx = cx + ux * best;
  const gy = cy + uy * best;
  const bx = at(b, ball, F.x);
  const by = at(b, ball, F.y);
  let ox = bx - gx;
  let oy = by - gy;
  const ol = Math.sqrt(ox * ox + oy * oy);
  ox /= ol;
  oy /= ol;
  let pocket = -1;
  let bestCos = POCKET_CONE_COS;
  let toPocket = 0;
  POCKET_MOUTHS.forEach((m, i) => {
    const mx = m.x - bx;
    const my = m.y - by;
    const ml = Math.sqrt(mx * mx + my * my);
    const c = (mx * ox + my * oy) / ml;
    if (c > bestCos) {
      bestCos = c;
      pocket = i;
      toPocket = ml;
    }
  });
  if (pocket < 0) return null;
  const cut = ux * ox + uy * oy;
  const travelM = best + toPocket;
  const tier: Tier =
    cut >= STRAIGHT_COS && travelM < SHORT_TRAVEL_M
      ? 'straight'
      : cut >= CUT_COS && travelM < LONG_TRAVEL_M
        ? 'cut'
        : cut >= THIN_COS && travelM < LONG_TRAVEL_M
          ? 'thin'
          : 'long';
  return { ball, pocket, tier, cut, travelM };
}

/** Did this simulated shot sink the called ball in the called pocket, without scratching? */
export function made(events: readonly ShotEvent[], ball: number, pocket: number) {
  let hit = false;
  let scratch = false;
  for (const e of events) {
    if (e.kind === 'pocket' && e.a === ball && e.pocket === pocket) hit = true;
    if (e.kind === 'pocket' && e.a === CUE_BALL) scratch = true;
  }
  return hit && !scratch;
}

/** Did the called ball rattle the called pocket's jaws (the drama a miss should have)? */
function rattled(events: readonly ShotEvent[], ball: number, pocket: number, b: Balls) {
  const m = POCKET_MOUTHS[pocket];
  if (!m) return false;
  const x = at(b, ball, F.x);
  const y = at(b, ball, F.y);
  const near = (x - m.x) ** 2 + (y - m.y) ** 2 < 0.25 ** 2;
  return near && events.some((e) => e.kind === 'cushion' && e.a === ball);
}

/** Search budget: tremor steps and the widest tremor (radians of aim, share of power). */
const MAKE_TRIES = 48;
const MISS_TRIES = 48;
const MAX_AIM_TREMOR = 0.035;
const MAX_POWER_TREMOR = 0.06;

function tremble(base: Shot, aim: number, power: number): Shot {
  const l = Math.sqrt(base.dx * base.dx + base.dy * base.dy);
  const ux = base.dx / l;
  const uy = base.dy / l;
  // Small-angle rotation (the tremor never exceeds ~2°).
  return {
    ...base,
    dx: ux - uy * aim,
    dy: uy + ux * aim,
    power: Math.min(1, Math.max(0.05, base.power * (1 + power))),
  };
}

function simulate(b: Balls, shot: Shot) {
  const sim = new PoolSim(new Float64Array(b));
  sim.shoot(shot);
  sim.runToRest();
  return sim;
}

/**
 * Find a stroke that makes the call, closest to the player's own first (the tremor grows step by
 * step). Null if none exists within the budget: that call isn't offered.
 */
export function findMake(b: Balls, base: Shot, call: Call, seed: number): Shot | null {
  const rand = prng(seed);
  for (let k = 0; k < MAKE_TRIES; k++) {
    const spread = k / MAKE_TRIES;
    const shot =
      k === 0
        ? base
        : tremble(
            base,
            (rand() * 2 - 1) * MAX_AIM_TREMOR * spread,
            (rand() * 2 - 1) * MAX_POWER_TREMOR * spread,
          );
    if (made(simulate(b, shot).events, call.ball, call.pocket)) return shot;
  }
  return null;
}

/**
 * Find a stroke that misses the call, preferring one that rattles the jaws (a near miss). Starts
 * from the smallest tremor so it still reads as the player's shot.
 */
export function findMiss(b: Balls, base: Shot, call: Call, seed: number): Shot {
  const rand = prng(seed);
  let fallback: Shot | null = null;
  for (let k = 1; k <= MISS_TRIES; k++) {
    const spread = k / MISS_TRIES;
    const sign = rand() < 0.5 ? -1 : 1;
    const shot = tremble(
      base,
      sign * (0.15 + 0.85 * rand()) * MAX_AIM_TREMOR * spread,
      (rand() * 2 - 1) * MAX_POWER_TREMOR * spread,
    );
    const sim = simulate(b, shot);
    if (made(sim.events, call.ball, call.pocket)) continue;
    if (rattled(sim.events, call.ball, call.pocket, sim.balls)) return shot;
    fallback ??= shot;
  }
  // Nothing rattled: take the first clean miss, else pull the cue well off line.
  return fallback ?? tremble(base, MAX_AIM_TREMOR * 3, 0);
}
