import {
  ballBallToi,
  type Contact,
  pointToi,
  resolveBallBall,
  resolveCluster,
  resolveCushion,
  resolveKnuckle,
  segmentToi,
} from './collide.ts';
import {
  BALL_COUNT,
  BALL_RADIUS_M,
  CLUSTER_GAP_M,
  CLUSTER_ITERATIONS,
  HALF_L,
  HALF_W,
  MAX_EVENTS_PER_STEP,
  MAX_SHOT_STEPS,
  STEP_S,
} from './constants.ts';
import { type Shot, strike } from './cue.ts';
import { advanceBall, isMoving } from './motion.ts';
import { at, type Balls, F, ON_TABLE, onTable, STRIDE, set } from './state.ts';
import { nearestPocket, POCKET_DROP_M, type Point, type Segment, TABLE } from './table.ts';

/** What happened during a shot, in order: drives rules, audio and the renderer. */
export type ShotEvent =
  | { kind: 'ball'; step: number; a: number; b: number; speed: number }
  | { kind: 'cushion'; step: number; a: number; speed: number }
  | { kind: 'pocket'; step: number; a: number; pocket: number; speed: number };

/** Two balls can only touch if their centres are within 2R (+ a hair for rounding). */
const PAIR_REACH = 2 * BALL_RADIUS_M + 1e-6;
/** Inside this box a ball is at least one radius clear of every cushion, jaw and knuckle. */
const RAIL_CLEAR_X = HALF_L - 2 * BALL_RADIUS_M;
const RAIL_CLEAR_Y = HALF_W - 2 * BALL_RADIUS_M;

/** Kind codes for the earliest-contact search (no strings in the hot loop). */
const HIT_NONE = 0;
const HIT_BALL = 1;
const HIT_SEGMENT = 2;
const HIT_KNUCKLE = 3;

export class PoolSim {
  readonly balls: Balls;
  events: ShotEvent[] = [];
  stepIndex = 0;
  /** Stationary balls are skipped entirely; this is rebuilt each step. */
  private moving: number[] = [];
  private movingFlag = new Uint8Array(BALL_COUNT);
  /** How far each moving ball can travel in the current sub-step (m). */
  private reach = new Float64Array(BALL_COUNT);

  constructor(balls: Balls) {
    this.balls = balls;
  }

  shoot(shot: Shot) {
    this.events = [];
    this.stepIndex = 0;
    strike(this.balls, shot);
  }

  /** True while any ball on the table still moves or spins. */
  get active(): boolean {
    for (let i = 0; i < BALL_COUNT; i++)
      if (onTable(this.balls, i) && isMoving(this.balls, i)) return true;
    return false;
  }

  /** One fixed step: resolve contacts in time order inside it, then pocket anything that fell. */
  step() {
    const b = this.balls;
    this.moving.length = 0;
    for (let i = 0; i < BALL_COUNT; i++) if (onTable(b, i) && isMoving(b, i)) this.moving.push(i);
    let left = STEP_S;
    for (let n = 0; n < MAX_EVENTS_PER_STEP && left > 0; n++) {
      let best = left;
      let kind = HIT_NONE;
      let hi = -1;
      let hj = -1;
      const reach = this.reach;
      const moving = this.movingFlag;
      moving.fill(0);
      for (const i of this.moving) {
        moving[i] = 1;
        const vx = at(b, i, F.vx);
        const vy = at(b, i, F.vy);
        reach[i] = Math.sqrt(vx * vx + vy * vy) * best;
      }
      for (const i of this.moving) {
        const xi = at(b, i, F.x);
        const yi = at(b, i, F.y);
        const ri = reach[i] ?? 0;
        for (let j = 0; j < BALL_COUNT; j++) {
          if (j === i || !onTable(b, j)) continue;
          // A moving pair is checked once (from the lower index).
          if (j < i && moving[j]) continue;
          // Broad phase: too far apart to meet within this sub-step.
          const gap = PAIR_REACH + ri + (moving[j] ? (reach[j] ?? 0) : 0);
          const dx = at(b, j, F.x) - xi;
          const dy = at(b, j, F.y) - yi;
          if (dx * dx + dy * dy > gap * gap) continue;
          const t = ballBallToi(b, i, j, best);
          if (t >= 0 && (t < best || kind === HIT_NONE)) {
            best = t;
            kind = HIT_BALL;
            hi = i;
            hj = j;
          }
        }
        // Broad phase: mid-table balls can't reach any cushion, jaw or knuckle this sub-step.
        const ax = xi < 0 ? -xi : xi;
        const ay = yi < 0 ? -yi : yi;
        if (ax + ri < RAIL_CLEAR_X && ay + ri < RAIL_CLEAR_Y) continue;
        const segments = TABLE.segments;
        for (let k = 0; k < segments.length; k++) {
          const t = segmentToi(b, i, segments[k] as Segment, best);
          if (t >= 0 && (t < best || kind === HIT_NONE)) {
            best = t;
            kind = HIT_SEGMENT;
            hi = i;
            hj = k;
          }
        }
        const knuckles = TABLE.knuckles;
        for (let k = 0; k < knuckles.length; k++) {
          const t = pointToi(b, i, knuckles[k] as Point, best);
          if (t >= 0 && (t < best || kind === HIT_NONE)) {
            best = t;
            kind = HIT_KNUCKLE;
            hi = i;
            hj = k;
          }
        }
      }
      for (const i of this.moving) advanceBall(b, i, best);
      left -= best;
      if (kind === HIT_NONE) break;
      if (kind === HIT_BALL) {
        this.impact(hi, hj);
      } else if (kind === HIT_SEGMENT) {
        const s = TABLE.segments[hj];
        if (s) {
          const speed = resolveCushion(b, hi, -s.nx, -s.ny);
          this.events.push({ kind: 'cushion', step: this.stepIndex, a: hi, speed });
        }
      } else {
        const p = TABLE.knuckles[hj];
        if (p) {
          const speed = resolveKnuckle(b, hi, p);
          this.events.push({ kind: 'cushion', step: this.stepIndex, a: hi, speed });
        }
      }
    }
    // Past the cushion line by the drop depth = in the pocket (only mouths are open there).
    for (const i of this.moving) {
      const x = at(b, i, F.x);
      const y = at(b, i, F.y);
      const ax = x < 0 ? -x : x;
      const ay = y < 0 ? -y : y;
      if (ax > HALF_L + POCKET_DROP_M || ay > HALF_W + POCKET_DROP_M) {
        const pocket = nearestPocket(x, y);
        const vx = at(b, i, F.vx);
        const vy = at(b, i, F.vy);
        this.events.push({
          kind: 'pocket',
          step: this.stepIndex,
          a: i,
          pocket,
          speed: Math.sqrt(vx * vx + vy * vy),
        });
        for (let f = F.vx; f <= F.wz; f++) set(b, i, f, 0);
        set(b, i, F.pocket, pocket);
      }
    }
    this.stepIndex += 1;
  }

  /**
   * A ball–ball impact. A lone pair gets the full frictional model (throw, spin transfer); a pair
   * touching others (a rack, a frozen combination) is solved as one simultaneous cluster.
   */
  private impact(hi: number, hj: number) {
    const b = this.balls;
    const cluster = [hi, hj];
    const near = (2 * BALL_RADIUS_M + CLUSTER_GAP_M) ** 2;
    const touching = (i: number, j: number) => {
      const dx = at(b, j, F.x) - at(b, i, F.x);
      const dy = at(b, j, F.y) - at(b, i, F.y);
      return dx * dx + dy * dy <= near;
    };
    for (let k = 0; k < cluster.length; k++) {
      const i = cluster[k] as number;
      for (let j = 0; j < BALL_COUNT; j++)
        if (!cluster.includes(j) && onTable(b, j) && touching(i, j)) cluster.push(j);
    }
    const step = this.stepIndex;
    if (cluster.length === 2) {
      const speed = resolveBallBall(b, hi, hj);
      this.events.push({ kind: 'ball', step, a: hi, b: hj, speed });
    } else {
      const contacts: Contact[] = [];
      const add = (i: number, j: number) => {
        const dx = at(b, j, F.x) - at(b, i, F.x);
        const dy = at(b, j, F.y) - at(b, i, F.y);
        const d = Math.sqrt(dx * dx + dy * dy);
        contacts.push({ i, j, nx: dx / d, ny: dy / d, closing: 0, impulse: 0 });
      };
      // The triggering pair first, so rules see the true first contact.
      add(hi, hj);
      for (let x = 0; x < cluster.length; x++)
        for (let y = x + 1; y < cluster.length; y++) {
          const i = cluster[x] as number;
          const j = cluster[y] as number;
          if ((i === hi && j === hj) || (i === hj && j === hi)) continue;
          if (touching(i, j)) add(i, j);
        }
      resolveCluster(b, contacts, CLUSTER_ITERATIONS);
      for (const c of contacts)
        if (c.impulse > 0)
          this.events.push({ kind: 'ball', step, a: c.i, b: c.j, speed: c.impulse * 2 });
    }
    for (const i of cluster) if (!this.moving.includes(i) && isMoving(b, i)) this.moving.push(i);
  }

  /** Run until everything stops (bots, seed search, remote replay). Returns steps taken. */
  runToRest(maxSteps = MAX_SHOT_STEPS): number {
    let n = 0;
    while (n < maxSteps && this.active) {
      this.step();
      n += 1;
    }
    return n;
  }
}

/** FNV-1a over the raw float bits: equal hashes mean bit-identical tables. */
export function hashBalls(b: Balls): string {
  const bytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  let h = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < bytes.length; i++) {
    const v = bytes[i] ?? 0;
    h = Math.imul(h ^ v, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ v ^ (i & 0xff), 0x85ebca6b) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export { ON_TABLE, STRIDE };
