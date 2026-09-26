import {
  DT,
  IDLE,
  type Input,
  newWorld,
  type SimEvent,
  tick,
  unpackWorld,
  type World,
} from '@arena/sim-runner';

import { EXHIBITION_RESTART_S, EXHIBITION_SKILLS } from '../config.ts';

export type RunnerMode =
  | { kind: 'exhibition' }
  | { kind: 'race'; bot: number; humanSlot: number }
  /** A room race: `humanSlot` is −1 for watchers. */
  | { kind: 'online'; humanSlot: number };

/** Longest frame we'll catch up on; beyond this the race just slows rather than spiralling. */
const MAX_STEPS_PER_FRAME = 8;
/** Unacknowledged inputs kept for replay (~1 s at 60 Hz). */
const MAX_PENDING = 60;
/** Corrections melt away at this rate (1/s), so a remote runner glides instead of snapping. */
const SMOOTH_RATE = 12;

type Pose = { s: number; y: number };

/**
 * Runs the deterministic race at a fixed 60 Hz under the render loop, keeping each runner's
 * previous tick so bodies draw interpolated between ticks. Online it predicts the whole race and
 * reconciles to the server's snapshots (only your own runner ever needs your inputs).
 */
export class RunnerDriver {
  world: World;
  mode: RunnerMode = { kind: 'exhibition' };
  private seed: number;
  private acc = 0;
  private restartIn = -1;
  /** 0..1 between the previous and current tick, for interpolated drawing. */
  alpha = 0;
  private prev: Pose[] = [];
  private smooth: Pose[] = [];
  private queue: SimEvent[] = [];
  private seqNo = 0;
  private pending: { seq: number; input: Input }[] = [];
  readInput: () => Input = () => IDLE;
  sendInput: ((seq: number, input: Input) => void) | null = null;

  constructor(seed: number) {
    this.seed = seed >>> 0 || 1;
    this.world = this.freshExhibition();
    this.reset();
  }

  private freshExhibition() {
    this.seed = Math.imul(this.seed ^ 0x5eed, 2654435761) >>> 0 || 1;
    return newWorld(this.seed, EXHIBITION_SKILLS);
  }

  exhibit() {
    this.mode = { kind: 'exhibition' };
    this.world = this.freshExhibition();
    this.reset();
  }

  /** Practice: you in slot 0 against three bots on a fresh course. */
  startRace(seed: number, bot: number) {
    this.seed = seed >>> 0 || 1;
    this.mode = { kind: 'race', bot, humanSlot: 0 };
    this.world = newWorld(this.seed, [-1, bot, bot, bot]);
    this.reset();
  }

  startOnline(seed: number, bots: readonly number[], humanSlot: number) {
    this.mode = { kind: 'online', humanSlot };
    this.world = newWorld(seed, bots);
    this.reset();
  }

  private reset() {
    this.acc = 0;
    this.restartIn = -1;
    this.queue.length = 0;
    this.pending = [];
    this.seqNo = 0;
    this.smooth = this.world.runners.map(() => ({ s: 0, y: 0 }));
    this.snapshot();
  }

  get humanSlot() {
    return 'humanSlot' in this.mode ? this.mode.humanSlot : -1;
  }

  /**
   * Who the camera rides with: you; otherwise the exhibition's lead bot while it's still running,
   * then whoever is furthest along.
   */
  get focus() {
    const you = this.humanSlot;
    if (you >= 0 && you < this.world.runners.length) return you;
    const first = this.world.runners[0];
    if (first && !first.out) return 0;
    let best = 0;
    this.world.runners.forEach((r, i) => {
      if (!r.out && r.s > (this.world.runners[best]?.s ?? 0)) best = i;
    });
    return best;
  }

  private snapshot() {
    this.prev = this.world.runners.map((r) => ({ s: r.s, y: r.y }));
  }

  update(delta: number) {
    const w = this.world;
    const k = Math.exp(-SMOOTH_RATE * delta);
    for (const s of this.smooth) {
      s.s *= k;
      s.y *= k;
    }
    if (w.phase === 'over') {
      if (this.mode.kind === 'exhibition') {
        if (this.restartIn < 0) this.restartIn = EXHIBITION_RESTART_S;
        this.restartIn -= delta;
        if (this.restartIn <= 0) this.exhibit();
      }
      return;
    }
    this.acc += delta;
    let steps = 0;
    const online = this.mode.kind === 'online';
    while (this.acc >= DT && steps < MAX_STEPS_PER_FRAME) {
      this.acc -= DT;
      steps += 1;
      this.snapshot();
      const human = w.runners[this.humanSlot];
      if (human) {
        human.input = this.readInput();
        if (online) {
          this.seqNo += 1;
          this.pending.push({ seq: this.seqNo, input: human.input });
          if (this.pending.length > MAX_PENDING) this.pending.shift();
          this.sendInput?.(this.seqNo, human.input);
        }
      }
      tick(w);
      for (const e of w.events) this.queue.push(e);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    this.alpha = this.acc / DT;
  }

  /**
   * Server snapshot: restore its exact race, drop inputs it has applied and replay the rest so our
   * own runner stays where our fingers put it. The visual jump is absorbed by decaying offsets.
   */
  applySnapshot(ack: number, packed: Float64Array) {
    if (this.mode.kind !== 'online') return;
    const w = this.world;
    const shown = w.runners.map((_, i) => this.poseOf(i));
    const wasOver = w.phase === 'over';
    if (!unpackWorld(w, packed)) return;
    this.pending = this.pending.filter((p) => p.seq > ack);
    const human = w.runners[this.humanSlot];
    if (human && w.phase !== 'over') {
      for (const p of this.pending) {
        human.input = p.input;
        tick(w);
      }
    }
    if (w.phase === 'over' && !wasOver) this.queue.push({ kind: 'over' });
    this.snapshot();
    w.runners.forEach((r, i) => {
      const s = this.smooth[i];
      const was = shown[i];
      if (!s || !was) return;
      s.s = was.s - r.s;
      s.y = was.y - r.y;
    });
  }

  drain(): SimEvent[] {
    if (this.queue.length === 0) return EMPTY;
    const out = this.queue;
    this.queue = [];
    return out;
  }

  /** Interpolated course position and height (plus any correction still melting away). */
  poseOf(i: number): Pose {
    const r = this.world.runners[i];
    const q = this.prev[i];
    if (!r) return { s: 0, y: 0 };
    if (!q) return { s: r.s, y: r.y };
    const a = this.alpha;
    const sm = this.smooth[i];
    return {
      s: q.s + (r.s - q.s) * a + (sm?.s ?? 0),
      y: q.y + (r.y - q.y) * a + (sm?.y ?? 0),
    };
  }

  /** The floating origin: where the focus runner is right now. */
  focusS() {
    return this.poseOf(this.focus).s;
  }
}

const EMPTY: SimEvent[] = [];
