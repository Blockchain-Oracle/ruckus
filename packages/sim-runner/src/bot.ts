import { LANES, REACH_M } from './constants.ts';
import { BARRIERS, type Entity, laneBlocked, PICKUPS } from './course.ts';
import { speedOf } from './step.ts';
import { type Input, isTaken, nextRandom, type Runner, type World } from './world.ts';

/** How far ahead (in seconds of running) a bot reads the road, by skill. */
const SIGHT_MIN_S = 0.4;
const SIGHT_MAX_S = 1.4;
/** A bot re-plans its lane every N ticks: slow thinkers commit late. */
const THINK_EVERY_MIN = 4;
const THINK_EVERY_MAX = 16;
/** Jump so the apex (0.4 s in) meets the barrier; duck a beat before it arrives. */
const JUMP_LEAD_S = 0.4;
const DUCK_LEAD_S = 0.18;
/** Timing error (s) at skill 0. */
const TIMING_SLOP_S = 0.2;
/** Chance a skill-0 bot never notices a barrier (falls off quadratically to 0 at skill 1). */
const MISS_CHANCE = 0.35;
/** Lane costs: a wall ends you, a verb barrier is work, a lane change is a small effort. */
const COST = { wall: 100, verb: 8, step: 1, coin: -2, pickup: -3 } as const;

/** The next barrier in `lane` the bot is aware of (one it failed to notice doesn't count). */
const firstThreat = (w: World, r: Runner, lane: number, until: number) => {
  for (let k = r.cursor; k < w.course.length; k++) {
    const e = w.course[k] as Entity;
    if (e.s > until) break;
    if (e.kind !== 'barrier' || k === r.brain.blind) continue;
    if (e.s > r.s - REACH_M && !isTaken(r, k) && laneBlocked(e.lanes, lane)) {
      return { k, e };
    }
  }
  return null;
};

function plan(w: World, r: Runner, skill: number, sight: number) {
  const until = r.s + speedOf(r) * sight;
  let best = r.lane;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let lane = 0; lane < LANES; lane++) {
    let cost = Math.abs(lane - r.lane) * COST.step;
    const threat = firstThreat(w, r, lane, until);
    if (threat) cost += BARRIERS[threat.e.barrier].verb === 'move' ? COST.wall : COST.verb;
    for (let k = r.cursor; k < w.course.length; k++) {
      const e = w.course[k] as Entity;
      if (e.s > until) break;
      if (e.kind === 'barrier' || e.kind === 'platform' || e.lane !== lane || isTaken(r, k))
        continue;
      // Sharp bots chase the buffs they can see coming; everyone grabs coins.
      if (e.kind === 'coin') cost += COST.coin;
      else if (PICKUPS[e.pickup].good || nextRandom(w) > skill) cost += COST.pickup * skill;
    }
    cost += (nextRandom(w) - 0.5) * 4 * (1 - skill);
    if (cost < bestCost || (cost === bestCost && lane === r.lane)) {
      best = lane;
      bestCost = cost;
    }
  }
  r.brain.lane = best;
  r.brain.slop = (nextRandom(w) * 2 - 1) * TIMING_SLOP_S * (1 - skill);
}

/** Size up each barrier once as it comes into sight; weak bots sometimes never see one. */
function noticeBarriers(w: World, r: Runner, skill: number, until: number) {
  for (let k = Math.max(r.cursor, r.brain.seen + 1); k < w.course.length; k++) {
    const e = w.course[k] as Entity;
    if (e.s > until) break;
    r.brain.seen = k;
    if (e.kind === 'barrier' && nextRandom(w) < MISS_CHANCE * (1 - skill) ** 2) {
      r.brain.blind = k;
    }
  }
}

/**
 * Runner bot: plans the cheapest lane over what it can see (walls, verb barriers, coins, buffs),
 * then meets each barrier in its lane with the colour's verb. Skill sets sight, re-plan rate and
 * timing error. Deterministic: its only randomness is the world's bot PRNG.
 */
export function thinkBot(w: World, i: number): Input {
  const r = w.runners[i] as Runner;
  const skill = Math.min(1, Math.max(0, r.bot / 100));
  const brain = r.brain;
  const sight = SIGHT_MIN_S + (SIGHT_MAX_S - SIGHT_MIN_S) * skill;
  noticeBarriers(w, r, skill, r.s + speedOf(r) * sight);
  if (w.tick >= brain.next) {
    brain.next = w.tick + Math.round(THINK_EVERY_MAX - (THINK_EVERY_MAX - THINK_EVERY_MIN) * skill);
    plan(w, r, skill, sight);
  }
  const input: Input = { h: 0, jump: false, duck: false };
  // Steer one press at a time (the sim moves a lane per fresh press).
  if (brain.lane !== r.lane && r.prev.h === 0) input.h = brain.lane > r.lane ? 1 : -1;

  const speed = speedOf(r);
  const threat = firstThreat(w, r, r.lane, r.s + speed * sight);
  if (threat) {
    const verb = BARRIERS[threat.e.barrier].verb;
    const eta = (threat.e.s - r.s) / speed;
    if (verb === 'jump' && brain.jumpAt !== threat.k && eta <= JUMP_LEAD_S + brain.slop) {
      if (r.grounded && !r.prev.jump) {
        input.jump = true;
        brain.jumpAt = threat.k;
      }
    } else if ((verb === 'duck' || verb === 'strict') && eta <= DUCK_LEAD_S + brain.slop) {
      brain.duckUntil = threat.e.s + REACH_M;
    }
  }
  if (r.s < brain.duckUntil) input.duck = true;
  // Reverse swaps the verbs; sharp bots read their own debuff.
  if (r.power === 'reverse' && skill > 0.5) {
    input.h = -input.h as Input['h'];
    [input.jump, input.duck] = [input.duck, input.jump];
  }
  return input;
}
