import {
  DT,
  gauntletWorld,
  IDLE,
  type Input,
  newWorld,
  packInput,
  type Recording,
  recordedInput,
  type SimEvent,
  tick,
  unpackWorld,
  WIPEOUTS,
  type World,
  wipeoutOf,
} from '@arena/sim-runner';

import { EXHIBITION_RESTART_S, EXHIBITION_SKILLS } from '../config.ts';

export type RunnerMode =
  | { kind: 'exhibition' }
  | { kind: 'race'; bot: number; humanSlot: number }
  /** A room race: `humanSlot` is −1 for watchers. */
  | { kind: 'online'; humanSlot: number }
  /** Lessons: you alone on roads the tutorial director lays. */
  | { kind: 'tutorial'; humanSlot: number }
  /** Call the Wipeout: a bank seed's gauntlet, watched (no human runner). */
  | { kind: 'wager'; seed: number };

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
  /** Your held input every tick of this race (a "beat my run" link is this plus the seed). */
  private frames: number[] = [];
  /** Recorded runs racing as ghosts, by sim slot (a challenger's run). */
  private replays = new Map<number, Recording>();
  /** Holds the race still (a wager's lineup before the call, its last frame after). */
  paused = false;
  /** Names a gauntlet's ending as it happens (wager mode only), once. */
  onEnding: ((ending: number) => void) | null = null;
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

  /** Beat my run: you in slot 0 against a recorded run's ghost on its own course. */
  startChallenge(run: Recording) {
    this.seed = run.seed;
    this.mode = { kind: 'race', bot: -1, humanSlot: 0 };
    this.world = newWorld(run.seed, [-1, -1]);
    this.reset();
    this.replays.set(1, run);
  }

  /** The race so far as a recording (your inputs on this seed). */
  recording(): Recording {
    return { seed: this.world.seed, frames: Uint8Array.from(this.frames) };
  }

  startTutorial() {
    this.mode = { kind: 'tutorial', humanSlot: 0 };
    this.world = newWorld(1, [-1]);
    this.reset();
  }

  /** Pieces were moved by hand (a lesson's staging): draw them there, no tween. */
  resync() {
    this.snapshot();
    for (const s of this.smooth) s.s = s.y = 0;
  }

  /** A bank seed's gauntlet; `paused` shows its start line until the round is settled. */
  startGauntlet(seed: number, paused: boolean) {
    this.mode = { kind: 'wager', seed };
    this.world = gauntletWorld(seed);
    this.reset();
    this.paused = paused;
  }

  /** Tap to skip: run the gauntlet straight to its ending. */
  skipToEnd() {
    if (this.mode.kind !== 'wager') return;
    const w = this.world;
    for (let i = 0; i < 6_000 && this.onEnding; i++) {
      tick(w);
      for (const e of w.events) this.queue.push(e);
      this.checkEnding(w.events);
    }
    this.snapshot();
  }

  private checkEnding(events: readonly SimEvent[]) {
    if (!this.onEnding) return;
    const ending = wipeoutOf(this.world, events);
    if (!ending) return;
    const done = this.onEnding;
    this.onEnding = null;
    done(WIPEOUTS.indexOf(ending));
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
    this.frames = [];
    this.replays = new Map();
    this.paused = false;
    this.onEnding = null;
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
    if (this.paused) return;
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
      for (const [slot, run] of this.replays) {
        const r = w.runners[slot];
        if (r) r.input = recordedInput(run, w.tick);
      }
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
      const at = w.tick;
      tick(w);
      // Frame i is the input applied going into tick i + 1, exactly how a replay feeds it back.
      if (human) this.frames[at] = packInput(human.input);
      for (const e of w.events) this.queue.push(e);
      this.checkEnding(w.events);
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
