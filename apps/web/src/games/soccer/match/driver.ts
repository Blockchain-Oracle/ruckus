import { DT, type Input, newWorld, type SimEvent, tick, type World } from '@arena/sim-soccer';

import { EXHIBITION_RESTART_S, EXHIBITION_SKILL, SLOWMO_S, SLOWMO_SCALE } from '../config.ts';

export type SoccerMode =
  | { kind: 'exhibition' }
  | { kind: 'match'; perTeam: 1 | 2; bot: number; humanSlot: number };

/** Longest frame we'll catch up on; beyond this the match just slows rather than spiralling. */
const MAX_STEPS_PER_FRAME = 8;
const IDLE: Input = { h: 0, jump: false };

type Pose = { x: number; y: number };

/**
 * Runs the deterministic sim at a fixed 60 Hz under the render loop, keeping the previous tick's
 * positions so bodies draw interpolated between ticks (smooth on 120 Hz screens, honest on 30).
 */
export class SoccerDriver {
  world: World;
  mode: SoccerMode = { kind: 'exhibition' };
  private seed: number;
  private acc = 0;
  /** Render-time slow motion (goal replays of the moment), never touches the sim's clock. */
  private slowmo = 0;
  private restartIn = -1;
  /** 0..1 between the previous and current tick, for interpolated drawing. */
  alpha = 0;
  prevBall: Pose = { x: 0, y: 0 };
  prevPlayers: Pose[] = [];
  /** Events since the last drain (audio, effects, HUD). */
  private queue: SimEvent[] = [];
  readInput: () => Input = () => IDLE;
  onFullTime: (() => void) | null = null;

  constructor(seed: number) {
    this.seed = seed >>> 0 || 1;
    this.world = this.freshExhibition();
    this.snapshot();
  }

  private freshExhibition() {
    this.seed = Math.imul(this.seed ^ 0x9e37, 2654435761) >>> 0 || 1;
    return newWorld(this.seed, 2, [
      EXHIBITION_SKILL,
      EXHIBITION_SKILL,
      EXHIBITION_SKILL - 10,
      EXHIBITION_SKILL - 10,
    ]);
  }

  exhibit() {
    this.mode = { kind: 'exhibition' };
    this.world = this.freshExhibition();
    this.reset();
  }

  /** A practice match: you (slot `humanSlot`, team 0) with an optional bot partner, vs bots. */
  startMatch(seed: number, perTeam: 1 | 2, bot: number) {
    this.seed = seed >>> 0 || 1;
    const seats = perTeam * 2;
    const bots = Array.from({ length: seats }, (_, i) => (i === 0 ? -1 : bot));
    this.mode = { kind: 'match', perTeam, bot, humanSlot: 0 };
    this.world = newWorld(this.seed, perTeam, bots);
    this.reset();
  }

  private reset() {
    this.acc = 0;
    this.slowmo = 0;
    this.restartIn = -1;
    this.queue.length = 0;
    this.snapshot();
  }

  get humanSlot() {
    return this.mode.kind === 'match' ? this.mode.humanSlot : -1;
  }

  private snapshot() {
    const w = this.world;
    this.prevBall.x = w.ball.x;
    this.prevBall.y = w.ball.y;
    this.prevPlayers = w.players.map((p) => ({ x: p.x, y: p.y }));
  }

  update(delta: number) {
    const w = this.world;
    if (w.phase === 'over') {
      if (this.mode.kind === 'exhibition') {
        if (this.restartIn < 0) this.restartIn = EXHIBITION_RESTART_S;
        this.restartIn -= delta;
        if (this.restartIn <= 0) this.exhibit();
      }
      return;
    }
    let scaled = delta;
    if (this.slowmo > 0) {
      this.slowmo -= delta;
      scaled *= SLOWMO_SCALE;
    }
    this.acc += scaled;
    let steps = 0;
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= DT;
      steps += 1;
      this.snapshot();
      const human = w.players[this.humanSlot];
      if (human) human.input = this.readInput();
      tick(w);
      for (const e of w.events) {
        this.queue.push(e);
        if (e.kind === 'goal') this.slowmo = SLOWMO_S;
        if (e.kind === 'whistle' && e.what === 'fulltime') this.onFullTime?.();
      }
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.alpha = this.acc / DT;
  }

  drain(): SimEvent[] {
    if (this.queue.length === 0) return EMPTY;
    const out = this.queue;
    this.queue = [];
    return out;
  }

  /** Interpolated draw positions. */
  ballAt(): Pose {
    const b = this.world.ball;
    const a = this.alpha;
    return {
      x: this.prevBall.x + (b.x - this.prevBall.x) * a,
      y: this.prevBall.y + (b.y - this.prevBall.y) * a,
    };
  }

  playerAt(i: number): Pose {
    const p = this.world.players[i];
    const q = this.prevPlayers[i];
    if (!p) return { x: 0, y: 0 };
    if (!q) return { x: p.x, y: p.y };
    const a = this.alpha;
    return { x: q.x + (p.x - q.x) * a, y: q.y + (p.y - q.y) * a };
  }
}

const EMPTY: SimEvent[] = [];
