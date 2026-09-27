import {
  DT,
  FinishTracker,
  goldenWorld,
  type Input,
  type Layout,
  layoutTeams,
  newWorld,
  type SimEvent,
  type Team,
  tick,
  unpackWorld,
  type World,
} from '@arena/sim-soccer';

import { EXHIBITION_RESTART_S, EXHIBITION_SKILL, SLOWMO_S, SLOWMO_SCALE } from '../config.ts';

export type SoccerMode =
  | { kind: 'exhibition' }
  | { kind: 'match'; layout: Layout; bot: number; humanSlot: number }
  /** Lessons: you and a parked second egg, staged by the tutorial director. */
  | { kind: 'tutorial'; humanSlot: number }
  /** Call the Finish: a bank seed's golden-goal bot match, watched (no human egg). */
  | { kind: 'wager'; seed: number }
  /** A room match: `humanSlot` is −1 for watchers. */
  | { kind: 'online'; humanSlot: number };

/** Longest frame we'll catch up on; beyond this the match just slows rather than spiralling. */
const MAX_STEPS_PER_FRAME = 8;
/** Unacknowledged inputs kept for replay (~1 s at 60 Hz). */
const MAX_PENDING = 60;
/** Corrections melt away at this rate (1/s), so a remote egg glides instead of snapping. */
const SMOOTH_RATE = 14;
const IDLE: Input = { h: 0, jump: false };

type Pose = { x: number; y: number };

/**
 * Runs the deterministic sim at a fixed 60 Hz under the render loop, keeping the previous tick's
 * positions so bodies draw interpolated between ticks (smooth on 120 Hz screens, honest on 30).
 * Online it predicts the whole world and reconciles to the server's snapshots.
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
  /** Visual offsets left over from a correction, decaying to zero (ball, then each player). */
  private smooth: Pose[] = [];
  /** Events since the last drain (audio, effects, HUD). */
  private queue: SimEvent[] = [];
  private seq = 0;
  private pending: { seq: number; input: Input }[] = [];
  /** Holds the world still (a wager's lineup before the call, its final frame after). */
  paused = false;
  /** Names a golden-goal finish as it happens (wager mode only). */
  private finish: FinishTracker | null = null;
  onFinish: ((finish: number) => void) | null = null;
  readInput: () => Input = () => IDLE;
  sendInput: ((seq: number, input: Input) => void) | null = null;

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

  /** A practice match: you (slot 0, Tomato), everyone else a bot, in the chosen line-up. */
  startMatch(seed: number, layout: Layout, bot: number) {
    this.seed = seed >>> 0 || 1;
    const seats = layoutTeams(layout).length;
    const bots = Array.from({ length: seats }, (_, i) => (i === 0 ? -1 : bot));
    this.mode = { kind: 'match', layout, bot, humanSlot: 0 };
    this.world = newWorld(this.seed, layout, bots);
    this.reset();
  }

  startTutorial() {
    this.mode = { kind: 'tutorial', humanSlot: 0 };
    this.world = newWorld(1, 1, [-1, -1]);
    this.reset();
  }

  /** A bank seed's golden goal; `paused` shows its lineup until the round is settled. */
  startGolden(seed: number, paused: boolean) {
    this.mode = { kind: 'wager', seed };
    this.world = goldenWorld(seed);
    this.reset();
    this.paused = paused;
    this.finish = new FinishTracker();
  }

  /** Tap to skip: run the golden goal straight to its finish. */
  skipToFinish() {
    if (this.mode.kind !== 'wager' || !this.finish) return;
    const w = this.world;
    for (let i = 0; i < 2_000 && this.finish.result === null; i++) {
      tick(w);
      for (const e of w.events) this.queue.push(e);
      this.finish.observe(w);
    }
    this.snapshot();
    this.announceFinish();
  }

  private announceFinish() {
    const r = this.finish?.result;
    if (r === null || r === undefined || !this.onFinish) return;
    const done = this.onFinish;
    this.onFinish = null;
    done(r);
  }

  /** Pieces were moved by hand (a lesson's staging): draw them there, no tween. */
  resync() {
    this.snapshot();
    for (const s of this.smooth) s.x = s.y = 0;
  }

  /** A room match: the same world every client builds from the server's seed. */
  startOnline(seed: number, teams: readonly Team[], bots: readonly number[], humanSlot: number) {
    this.mode = { kind: 'online', humanSlot };
    this.world = newWorld(seed, teams, bots);
    this.reset();
  }

  private reset() {
    this.acc = 0;
    this.slowmo = 0;
    this.restartIn = -1;
    this.queue.length = 0;
    this.pending = [];
    this.seq = 0;
    this.paused = false;
    this.finish = null;
    this.smooth = Array.from({ length: this.world.players.length + 1 }, () => ({ x: 0, y: 0 }));
    this.snapshot();
  }

  get humanSlot() {
    return 'humanSlot' in this.mode ? this.mode.humanSlot : -1;
  }

  private snapshot() {
    const w = this.world;
    this.prevBall.x = w.ball.x;
    this.prevBall.y = w.ball.y;
    this.prevPlayers = w.players.map((p) => ({ x: p.x, y: p.y }));
  }

  update(delta: number) {
    const w = this.world;
    for (const s of this.smooth) {
      const k = Math.exp(-SMOOTH_RATE * delta);
      s.x *= k;
      s.y *= k;
    }
    if (this.paused) return;
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
    const online = this.mode.kind === 'online';
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= DT;
      steps += 1;
      this.snapshot();
      const human = w.players[this.humanSlot];
      if (human) {
        human.input = this.readInput();
        if (online) {
          this.seq += 1;
          this.pending.push({ seq: this.seq, input: human.input });
          if (this.pending.length > MAX_PENDING) this.pending.shift();
          this.sendInput?.(this.seq, human.input);
        }
      }
      tick(w);
      if (this.finish && this.finish.observe(w) !== null) this.announceFinish();
      for (const e of w.events) {
        this.queue.push(e);
        // Slow motion would put an online client behind the server's clock: offline only.
        if (e.kind === 'goal' && !online) this.slowmo = SLOWMO_S;
      }
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.alpha = this.acc / DT;
  }

  /**
   * Server snapshot: restore its exact world, drop inputs it has applied, and replay the rest so
   * our own egg stays where our fingers put it. Remote eggs keep their last applied input until
   * the next snapshot (whole-world prediction). The visual jump is absorbed by decaying offsets.
   */
  applySnapshot(ack: number, packed: Float64Array) {
    if (this.mode.kind !== 'online') return;
    const w = this.world;
    const shown = [this.ballAt(), ...w.players.map((_, i) => this.playerAt(i))];
    const score: [number, number] = [w.score[0], w.score[1]];
    const wasOver = w.phase === 'over';
    if (!unpackWorld(w, packed)) return;
    this.pending = this.pending.filter((p) => p.seq > ack);
    const human = w.players[this.humanSlot];
    if (human && w.phase !== 'over') {
      for (const p of this.pending) {
        human.input = p.input;
        tick(w);
        if (isOver(w)) break;
      }
    }
    // Moments only the server saw (a goal we didn't predict, the final whistle) still get their
    // sounds and call-outs; everything else in the replay already played when predicted.
    for (const team of [0, 1] as const)
      if (w.score[team] > score[team]) this.queue.push({ kind: 'goal', team });
    if (w.phase === 'over' && !wasOver) this.queue.push({ kind: 'whistle', what: 'fulltime' });
    this.snapshot();
    const now = [w.ball, ...w.players];
    now.forEach((b, i) => {
      const s = this.smooth[i];
      const was = shown[i];
      if (!s || !was) return;
      s.x = was.x - b.x;
      s.y = was.y - b.y;
    });
  }

  drain(): SimEvent[] {
    if (this.queue.length === 0) return EMPTY;
    const out = this.queue;
    this.queue = [];
    return out;
  }

  /** Interpolated draw positions (plus any correction still melting away). */
  ballAt(): Pose {
    const b = this.world.ball;
    const a = this.alpha;
    const s = this.smooth[0];
    return {
      x: this.prevBall.x + (b.x - this.prevBall.x) * a + (s?.x ?? 0),
      y: this.prevBall.y + (b.y - this.prevBall.y) * a + (s?.y ?? 0),
    };
  }

  playerAt(i: number): Pose {
    const p = this.world.players[i];
    const q = this.prevPlayers[i];
    if (!p) return { x: 0, y: 0 };
    const s = this.smooth[i + 1];
    if (!q) return { x: p.x, y: p.y };
    const a = this.alpha;
    return {
      x: q.x + (p.x - q.x) * a + (s?.x ?? 0),
      y: q.y + (p.y - q.y) * a + (s?.y ?? 0),
    };
  }
}

const EMPTY: SimEvent[] = [];
/** Read through a call: `tick` mutates the phase, which narrowing can't see. */
const isOver = (w: World) => w.phase === 'over';
