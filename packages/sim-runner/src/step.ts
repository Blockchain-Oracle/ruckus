import {
  COAST_S,
  COIN_VALUE,
  COLLECT_RADIUS_M,
  COURSE_M,
  COYOTE_S,
  DT,
  DUCK_HEIGHT_M,
  FINISH_GRACE_S,
  GRAVITY_MPS2,
  HIT_COST,
  HIT_SLOW,
  HIT_SLOW_S,
  INVULNERABLE_S,
  JUMP_BUFFER_S,
  JUMP_SPEED_MPS,
  LANES,
  MAGNET_RANGE_M,
  MOMENTUM_MAX_COINS,
  MOMENTUM_PER_COIN,
  PLATFORM_EDGE_M,
  REACH_M,
  RUNNER_HEIGHT_M,
  SLAM_SPEED_MPS,
  SLOW_DOWN,
  SPEED_BOOST,
  TICK_HZ,
} from './constants.ts';
import { BARRIERS, baseSpeedAt, type Entity, laneBlocked, PICKUPS } from './course.ts';
import { isTaken, markTaken, type Runner, type World } from './world.ts';

const ticks = (seconds: number) => Math.round(seconds * TICK_HZ);
/** A platform may be stepped onto (or rises into) only below this climb speed (KK's rule). */
const MOUNT_MAX_VY = 2;
/** Falling through a platform's top this far still lands on it (fast falls skip past it). */
const LAND_TOLERANCE_M = 0.5;

export const runnerHeight = (r: Runner) => (r.ducking ? DUCK_HEIGHT_M : RUNNER_HEIGHT_M);

/** Coins carried, as a speed factor (1 + 1% per coin, capped). */
export const momentum = (r: Runner) =>
  1 + MOMENTUM_PER_COIN * Math.min(MOMENTUM_MAX_COINS, Math.floor(r.coins / COIN_VALUE));

/** Current forward speed: the stretch's base speed, then coins, hits and speed pickups. */
export function speedOf(r: Runner) {
  const power = r.power === 'speed' ? SPEED_BOOST : r.power === 'slow' ? SLOW_DOWN : 1;
  return baseSpeedAt(r.s) * momentum(r) * power * (r.hitSlow > 0 ? HIT_SLOW : 1);
}

const endOf = (e: Entity) => e.s + (e.kind === 'platform' ? e.lengthM : 0);

/** One 60 Hz tick. Inputs are already on the runners (humans set them; bots think first). */
export function step(w: World) {
  w.events.length = 0;
  w.tick += 1;
  if (w.phase === 'over') return;
  if (w.phase === 'countdown') {
    for (const r of w.runners) r.prev = { ...r.input };
    w.phaseTicks -= 1;
    if (w.phaseTicks <= 0) {
      w.phase = 'run';
      w.events.push({ kind: 'go' });
    }
    return;
  }
  const crossed: number[] = [];
  w.runners.forEach((r, i) => {
    if (r.out) return;
    if (r.finished >= 0) coast(w, r);
    else if (run(w, r, i)) crossed.push(i);
  });
  // Runners crossing in the same tick place by their exact crossing time, never by slot.
  crossed.sort((a, b) => (w.runners[a]?.finished ?? 0) - (w.runners[b]?.finished ?? 0) || a - b);
  for (const i of crossed) {
    w.finishers += 1;
    w.events.push({ kind: 'finish', runner: i, place: w.finishers });
    if (w.grace < 0) w.grace = ticks(FINISH_GRACE_S);
  }
  if (w.grace > 0) w.grace -= 1;
  const done = w.runners.every((r) => r.out || r.finished >= 0);
  if (done || w.grace === 0) {
    w.phase = 'over';
    w.events.push({ kind: 'over' });
  }
}

/** Past the line: ease to a stop on the road (no more collisions), ready to celebrate. */
export const coastSpeed = (w: World, r: Runner) =>
  baseSpeedAt(w.finishM) * Math.max(0, 1 - (w.tick - r.finished) / (COAST_S * TICK_HZ));

function coast(w: World, r: Runner) {
  r.s += coastSpeed(w, r) * DT;
  r.ducking = false;
  if (r.grounded && r.platform < 0) return;
  r.platform = -1;
  r.vy -= GRAVITY_MPS2 * DT;
  r.y += r.vy * DT;
  if (r.y <= 0) {
    r.y = 0;
    r.vy = 0;
    r.grounded = true;
  }
}

/** One tick of racing; true if the runner crossed the line on it. */
function run(w: World, r: Runner, i: number) {
  controls(w, r, i);
  const from = r.s;
  r.s += speedOf(r) * DT;
  vertical(w, r, i);
  while (r.cursor < w.course.length && endOf(w.course[r.cursor] as Entity) < r.s - REACH_M) {
    r.cursor += 1;
  }
  contacts(w, r, i);
  timers(w, r, i);
  if (r.s < w.finishM || r.out) return false;
  // The exact moment within the tick the line was crossed (ticks, fractional): photo finishes.
  r.finished = w.tick - 1 + (w.finishM - from) / (r.s - from);
  return true;
}

/** Presses from held input; the Reverse debuff swaps left↔right and jump↔duck. */
function controls(w: World, r: Runner, i: number) {
  const raw = r.input;
  let left = raw.h === -1 && r.prev.h !== -1;
  let right = raw.h === 1 && r.prev.h !== 1;
  let jumpPress = raw.jump && !r.prev.jump;
  let duckPress = raw.duck && !r.prev.duck;
  let duckHeld = raw.duck;
  if (r.power === 'reverse') {
    [left, right] = [right, left];
    [jumpPress, duckPress] = [duckPress, jumpPress];
    duckHeld = raw.jump;
  }
  r.prev = { ...raw };

  const lane = r.lane + (left ? -1 : 0) + (right ? 1 : 0);
  if (lane !== r.lane && lane >= 0 && lane < LANES) {
    r.lane = lane;
    w.events.push({ kind: 'lane', runner: i });
    if (r.platform >= 0) fallOff(r);
  }

  if (duckPress) {
    r.ducking = true;
    if (!r.grounded) {
      r.vy = Math.min(r.vy, -SLAM_SPEED_MPS);
      r.jumpBuffer = 0;
      w.events.push({ kind: 'slam', runner: i });
    }
  }
  if (!duckHeld) r.ducking = false;

  if (jumpPress) r.jumpBuffer = ticks(JUMP_BUFFER_S);
  if (r.jumpBuffer > 0 && (r.grounded || r.coyote > 0)) {
    r.vy = JUMP_SPEED_MPS;
    r.grounded = false;
    r.platform = -1;
    r.ducking = false;
    r.jumpBuffer = 0;
    r.coyote = 0;
    w.events.push({ kind: 'jump', runner: i });
  }
}

function fallOff(r: Runner) {
  r.platform = -1;
  r.grounded = false;
  r.vy = 0;
  r.coyote = ticks(COYOTE_S);
}

/** The platform in the runner's lane whose footprint covers them, if any. */
function platformUnder(w: World, r: Runner) {
  for (let k = r.cursor; k < w.course.length; k++) {
    const e = w.course[k] as Entity;
    if (e.s - PLATFORM_EDGE_M > r.s) break;
    if (e.kind === 'platform' && e.lane === r.lane && r.s <= endOf(e) + PLATFORM_EDGE_M) return k;
  }
  return -1;
}

function vertical(w: World, r: Runner, i: number) {
  if (r.grounded) {
    if (r.platform >= 0) {
      const p = w.course[r.platform] as Entity;
      if (r.s > endOf(p) + PLATFORM_EDGE_M) fallOff(r);
      return;
    }
    // Running into a platform steps you up onto it (it's solid).
    const k = platformUnder(w, r);
    if (k >= 0) {
      r.platform = k;
      r.y = (w.course[k] as Entity & { kind: 'platform' }).y;
      r.ducking = false;
    }
    return;
  }
  const prevY = r.y;
  r.vy -= GRAVITY_MPS2 * DT;
  r.y += r.vy * DT;
  const k = platformUnder(w, r);
  if (k >= 0) {
    const top = (w.course[k] as Entity & { kind: 'platform' }).y;
    const landing = r.vy <= 0 && prevY >= top - LAND_TOLERANCE_M && r.y <= top;
    const rising = r.y < top && r.vy <= MOUNT_MAX_VY;
    if (landing || rising) return land(w, r, i, top, k);
  }
  if (r.y <= 0) land(w, r, i, 0, -1);
}

function land(w: World, r: Runner, i: number, y: number, platform: number) {
  w.events.push({ kind: 'land', runner: i, speed: -r.vy });
  r.y = y;
  r.vy = 0;
  r.grounded = true;
  r.platform = platform;
  r.coyote = 0;
}

function contacts(w: World, r: Runner, i: number) {
  const magnet = r.power === 'magnet';
  const ahead = magnet ? MAGNET_RANGE_M : REACH_M;
  const low = r.y;
  const high = r.y + runnerHeight(r);
  const mid = (low + high) / 2;
  for (let k = r.cursor; k < w.course.length; k++) {
    const e = w.course[k] as Entity;
    if (e.s > r.s + ahead) break;
    if (isTaken(r, k) || e.kind === 'platform') continue;
    const near = e.s - r.s <= REACH_M && r.s - e.s <= REACH_M;
    if (e.kind === 'barrier') {
      if (!near || !laneBlocked(e.lanes, r.lane) || r.invulnerable > 0) continue;
      const b = BARRIERS[e.barrier];
      if (low < b.maxY && high > b.minY) {
        markTaken(r, k);
        hit(w, r, i, k);
        if (r.out) return;
      }
      continue;
    }
    const inReach = near && e.lane === r.lane && Math.abs(mid - e.y) <= COLLECT_RADIUS_M;
    if (e.kind === 'coin' && (inReach || (magnet && e.s >= r.s))) {
      markTaken(r, k);
      const value = COIN_VALUE * (r.power === 'double' ? 2 : 1);
      r.coins += value;
      w.events.push({ kind: 'coin', runner: i, value, entity: k });
    } else if (e.kind === 'pickup' && inReach) {
      markTaken(r, k);
      r.power = e.pickup;
      r.powerTicks = ticks(PICKUPS[e.pickup].seconds);
      w.events.push({ kind: 'pickup', runner: i, pickup: e.pickup, entity: k });
    }
  }
}

function hit(w: World, r: Runner, i: number, entity: number) {
  r.invulnerable = ticks(INVULNERABLE_S);
  if (r.power === 'shield') {
    r.power = null;
    r.powerTicks = 0;
    w.events.push({ kind: 'hit', runner: i, shielded: true, entity });
    return;
  }
  if (r.coins < HIT_COST) {
    r.out = true;
    w.events.push({ kind: 'wipeout', runner: i, entity });
    return;
  }
  r.coins -= HIT_COST;
  r.hitSlow = ticks(HIT_SLOW_S);
  w.events.push({ kind: 'hit', runner: i, shielded: false, entity });
}

function timers(w: World, r: Runner, i: number) {
  if (r.hitSlow > 0) r.hitSlow -= 1;
  if (r.invulnerable > 0) r.invulnerable -= 1;
  if (r.jumpBuffer > 0) r.jumpBuffer -= 1;
  if (r.coyote > 0) r.coyote -= 1;
  if (r.power && --r.powerTicks <= 0) {
    w.events.push({ kind: 'expire', runner: i, pickup: r.power });
    r.power = null;
    r.powerTicks = 0;
  }
}
