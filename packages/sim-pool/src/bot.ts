import { BALL_RADIUS_M, CUE_BALL, HALF_L, HALF_W, HEAD_STRING_X } from './constants.ts';
import type { Shot } from './cue.ts';
import { PoolSim } from './engine.ts';
import { prng } from './math.ts';
import { canPlaceCue, judgeShot, legalTargets, type RackState } from './rules.ts';
import { at, type Balls, F, onTable, set } from './state.ts';
import { POCKETS } from './table.ts';

const R = BALL_RADIUS_M;

/** Where an object ball must cross to drop: the centre of each pocket's mouth on the cushion line. */
const CORNER_IN = 0.042;
const MOUTH_AIM = POCKETS.map((p, i) =>
  i < 4
    ? { x: p.x - Math.sign(p.x) * CORNER_IN, y: p.y - Math.sign(p.y) * CORNER_IN }
    : { x: p.x, y: p.y },
);

/** Planning budget: candidates simulated per decision. */
const MAX_CANDIDATES = 24;
/** Cuts thinner than this (cos of the cut angle) are too risky to plan. */
const MIN_CUT_COS = 0.28;
/** Spin variants tried on each candidate (draw, stun-ish, follow). */
const SPINS = [-0.45, 0, 0.45] as const;
/** Aim error at difficulty 0, as a sideways offset per unit of aim (≈ 2.9°). */
const MAX_AIM_ERROR = 0.05;
const MAX_POWER_ERROR = 0.12;
/** Ball-in-hand placements considered (a grid over the legal area). */
const PLACE_GRID_X = 7;
const PLACE_GRID_Y = 4;

export type BotDecision = {
  shot: Shot;
  /** Cue-ball spot if the bot had ball in hand. */
  place: { x: number; y: number } | null;
  calledPocket: number;
};

type Candidate = {
  dx: number;
  dy: number;
  power: number;
  target: number;
  pocket: number;
  score: number;
};

/**
 * Pick a shot for the current shooter. Deterministic in (balls, state, difficulty, seed): plans with
 * the real engine and perfect information, then executes with difficulty-scaled noise (a human
 * miss, never a hidden handicap).
 */
export function botShot(
  balls: Balls,
  state: RackState,
  difficulty: number,
  seed: number,
): BotDecision {
  const rand = prng(seed);
  const skill = Math.min(1, Math.max(0, difficulty / 100));
  const table = new Float64Array(balls);
  let place: { x: number; y: number } | null = null;

  if (state.isBreak) {
    place = { x: HEAD_STRING_X * 1.5, y: (rand() - 0.5) * 0.3 };
    set(table, CUE_BALL, F.x, place.x);
    set(table, CUE_BALL, F.y, place.y);
    const apexX = HALF_L / 2;
    return {
      place,
      calledPocket: -1,
      shot: withNoise(
        { dx: apexX - place.x, dy: -place.y, power: 0.85 + 0.15 * skill, spinX: 0, spinY: -0.1 },
        skill,
        rand,
      ),
    };
  }

  if (state.ballInHand !== 'none') {
    place = bestPlacement(table, state, state.ballInHand);
    set(table, CUE_BALL, F.x, place.x);
    set(table, CUE_BALL, F.y, place.y);
    set(table, CUE_BALL, F.pocket, -1);
  }

  const best = plan(table, state);
  if (best) {
    return {
      place,
      calledPocket: best.pocket,
      shot: withNoise(best.shot, skill, rand),
    };
  }
  // Nothing to pot: roll into the nearest legal ball so at least it isn't a foul.
  return { place, calledPocket: -1, shot: withNoise(safety(table, state), skill, rand) };
}

function withNoise(shot: Shot, skill: number, rand: () => number): Shot {
  const miss = (1 - skill) * MAX_AIM_ERROR * gauss(rand);
  const l = Math.sqrt(shot.dx * shot.dx + shot.dy * shot.dy);
  const ux = shot.dx / l;
  const uy = shot.dy / l;
  return {
    ...shot,
    dx: ux - uy * miss,
    dy: uy + ux * miss,
    power: Math.min(
      1,
      Math.max(0.05, shot.power * (1 + (1 - skill) * MAX_POWER_ERROR * gauss(rand))),
    ),
  };
}

/** Approximately normal noise from four uniforms (Irwin–Hall), integer-free and deterministic. */
function gauss(rand: () => number) {
  return (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3);
}

/** Straight-line lane from a to b is clear of every other ball (by a ball width). */
function laneClear(b: Balls, ax: number, ay: number, bx: number, by: number, skip: number[]) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  for (let i = 0; i < 16; i++) {
    if (skip.includes(i) || !onTable(b, i)) continue;
    const px = at(b, i, F.x) - ax;
    const py = at(b, i, F.y) - ay;
    const t = (px * dx + py * dy) / l2;
    if (t <= 0 || t >= 1) continue;
    const qx = px - t * dx;
    const qy = py - t * dy;
    if (qx * qx + qy * qy < 4 * R * R) return false;
  }
  return true;
}

/** Ghost-ball candidates for every legal target and pocket, best-looking first. */
function candidates(b: Balls, state: RackState): Candidate[] {
  const cx = at(b, CUE_BALL, F.x);
  const cy = at(b, CUE_BALL, F.y);
  const out: Candidate[] = [];
  for (const t of legalTargets(state, b)) {
    const tx = at(b, t, F.x);
    const ty = at(b, t, F.y);
    MOUTH_AIM.forEach((m, pocket) => {
      let ux = m.x - tx;
      let uy = m.y - ty;
      const toPocket = Math.sqrt(ux * ux + uy * uy);
      ux /= toPocket;
      uy /= toPocket;
      const gx = tx - 2 * R * ux;
      const gy = ty - 2 * R * uy;
      let dx = gx - cx;
      let dy = gy - cy;
      const toGhost = Math.sqrt(dx * dx + dy * dy);
      dx /= toGhost;
      dy /= toGhost;
      const cut = dx * ux + dy * uy;
      if (cut < MIN_CUT_COS) return;
      if (!laneClear(b, tx, ty, m.x, m.y, [t, CUE_BALL])) return;
      if (!laneClear(b, cx, cy, gx, gy, [t, CUE_BALL])) return;
      // Power: enough to carry the object ball past the mouth; thin cuts need more.
      const power = Math.min(1, 0.12 + (toGhost + toPocket) * 0.16 + (1 - cut) * 0.25);
      out.push({ dx, dy, power, target: t, pocket, score: cut * 2 - (toGhost + toPocket) * 0.4 });
    });
  }
  return out.sort((a, c) => c.score - a.score).slice(0, MAX_CANDIDATES);
}

/** Simulate the candidates with the real engine and keep the best outcome. */
function plan(b: Balls, state: RackState): { shot: Shot; pocket: number } | null {
  let best: { shot: Shot; pocket: number } | null = null;
  let bestScore = 0;
  for (const c of candidates(b, state)) {
    for (const spinY of SPINS) {
      const shot: Shot = { dx: c.dx, dy: c.dy, power: c.power, spinX: 0, spinY };
      const score = evaluate(b, state, shot, c.pocket);
      if (score > bestScore) {
        bestScore = score;
        best = { shot, pocket: c.pocket };
      }
    }
  }
  return best;
}

/** Outcome value of one simulated shot for the shooter. */
function evaluate(b: Balls, state: RackState, shot: Shot, pocket: number): number {
  const sim = new PoolSim(new Float64Array(b));
  sim.shoot(shot);
  sim.runToRest();
  const trial: RackState = { ...state, groups: [...state.groups] as RackState['groups'] };
  const out = judgeShot(trial, b, sim.balls, sim.events, pocket);
  if (out.winner === state.shooter) return 10_000;
  if (out.winner >= 0) return 0;
  if (out.foul) return 0;
  if (!out.continues) return 1;
  // Kept the table: prefer leaves with an easy next shot.
  trial.isBreak = false;
  const next = candidates(sim.balls, trial);
  const leave = next[0] ? 50 + next[0].score * 10 : 20;
  return 100 + leave;
}

function safety(b: Balls, state: RackState): Shot {
  const cx = at(b, CUE_BALL, F.x);
  const cy = at(b, CUE_BALL, F.y);
  let best: Shot = { dx: 1, dy: 0, power: 0.4, spinX: 0, spinY: 0 };
  let bestD = Number.POSITIVE_INFINITY;
  for (const t of legalTargets(state, b)) {
    const dx = at(b, t, F.x) - cx;
    const dy = at(b, t, F.y) - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestD && laneClear(b, cx, cy, at(b, t, F.x), at(b, t, F.y), [t, CUE_BALL])) {
      bestD = d;
      best = { dx, dy, power: Math.min(0.9, 0.25 + d * 0.2), spinX: 0, spinY: 0 };
    }
  }
  return best;
}

/** Ball in hand: the grid spot whose best candidate looks easiest. */
function bestPlacement(b: Balls, state: RackState, where: 'anywhere' | 'kitchen') {
  const maxX = where === 'kitchen' ? HEAD_STRING_X : HALF_L - 2 * R;
  const minX = -HALF_L + 2 * R;
  let best = { x: HEAD_STRING_X * 1.5, y: 0 };
  let bestScore = Number.NEGATIVE_INFINITY;
  const probe = new Float64Array(b);
  set(probe, CUE_BALL, F.pocket, -1);
  for (let gx = 0; gx < PLACE_GRID_X; gx++) {
    for (let gy = 0; gy < PLACE_GRID_Y; gy++) {
      const x = minX + ((maxX - minX) * (gx + 0.5)) / PLACE_GRID_X;
      const y = -HALF_W + 2 * R + ((2 * HALF_W - 4 * R) * (gy + 0.5)) / PLACE_GRID_Y;
      if (!canPlaceCue(b, x, y, where)) continue;
      set(probe, CUE_BALL, F.x, x);
      set(probe, CUE_BALL, F.y, y);
      const c = candidates(probe, state)[0];
      const score = c ? c.score : -10;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}
