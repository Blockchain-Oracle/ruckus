import {
  applyOutcome,
  type Balls,
  type BotDecision,
  CUE_BALL,
  F,
  judgeShot,
  newRack,
  PoolSim,
  type RackState,
  rack,
  type Shot,
  type ShotEvent,
  type ShotOutcome,
  STEP_S,
  set,
} from '@arena/sim-pool';

/** Catch-up cap so a background tab doesn't replay minutes of physics in one frame. */
const MAX_STEPS_PER_FRAME = 64;

export type Seat = { name: string; bot: boolean; difficulty: number };
export type TurnPhase = 'break' | 'aim' | 'rolling' | 'over';

/**
 * One rack of 8-ball in real time: the sim steps at 512 Hz behind the frame loop, events are
 * queued for audio and effects, and the rules run when everything stops.
 */
export class PoolDriver {
  balls: Balls;
  rack: RackState;
  sim: PoolSim;
  phase: TurnPhase = 'aim';
  seats: [Seat, Seat];
  /** Set when a shot finishes; the director reads and clears it. */
  lastOutcome: ShotOutcome | null = null;
  /** Events not yet consumed by audio/effects (drained each frame). */
  pending: ShotEvent[] = [];
  seed: number;
  private before: Balls;
  private accumulator = 0;
  private emitted = 0;
  private calledPocket = -1;

  constructor(seed: number, seats: [Seat, Seat], breaker: 0 | 1 = 0) {
    this.seed = seed;
    this.seats = seats;
    this.balls = rack(seed);
    this.before = new Float64Array(this.balls);
    this.rack = newRack(breaker);
    this.sim = new PoolSim(this.balls);
  }

  get shooter() {
    return this.rack.shooter;
  }

  placeCue(x: number, y: number) {
    set(this.balls, CUE_BALL, F.x, x);
    set(this.balls, CUE_BALL, F.y, y);
    set(this.balls, CUE_BALL, F.pocket, -1);
  }

  shoot(shot: Shot, calledPocket: number) {
    if (this.phase === 'rolling' || this.phase === 'over') return;
    this.before = new Float64Array(this.balls);
    this.calledPocket = calledPocket;
    this.sim.shoot(shot);
    this.emitted = 0;
    this.accumulator = 0;
    this.phase = 'rolling';
  }

  applyBot(d: BotDecision) {
    if (d.place) this.placeCue(d.place.x, d.place.y);
    this.shoot(d.shot, d.calledPocket);
  }

  /**
   * Online: the server is the referee. A shot replays locally in real time, then the table and
   * rack snap to the server's result (identical physics; the rules' final say is the server's).
   */
  remote = false;
  private snap: { after: Balls; rack: RackState; message: string } | null = null;

  /** Replay a shot someone else played, from the exact table it started on. */
  replay(before: Balls, shot: Shot, calledPocket: number) {
    this.balls.set(before);
    this.phase = 'aim';
    this.shoot(shot, calledPocket);
  }

  setSnap(after: Balls, rack: RackState, message: string) {
    this.snap = { after, rack, message };
  }

  /** Load a table mid-rack (joining as a watcher, reconnecting). */
  load(balls: Balls, rack: RackState) {
    this.balls.set(balls);
    this.rack = { ...rack, groups: [...rack.groups] as RackState['groups'] };
    this.phase = rack.winner >= 0 ? 'over' : 'aim';
    this.snap = null;
  }

  /** Set when a shot comes to rest (however it got there); the director takes it once. */
  private rested = false;
  takeRested() {
    const r = this.rested;
    this.rested = false;
    return r;
  }

  /** Advance real time; returns true on the frame the shot came to rest. */
  update(dtS: number): boolean {
    if (this.phase !== 'rolling') return false;
    this.accumulator += dtS;
    let steps = 0;
    while (this.accumulator >= STEP_S && steps < MAX_STEPS_PER_FRAME) {
      this.sim.step();
      this.accumulator -= STEP_S;
      steps += 1;
      if (!this.sim.active) break;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    const events = this.sim.events;
    for (; this.emitted < events.length; this.emitted++) {
      const e = events[this.emitted];
      if (e) this.pending.push(e);
    }
    if (this.sim.active) return false;
    if (this.remote) {
      // Hold at rest until the server's verdict is here (normally it arrived long before).
      const snap = this.snap;
      if (!snap) return false;
      this.snap = null;
      this.balls.set(snap.after);
      this.rack = { ...snap.rack, groups: [...snap.rack.groups] as RackState['groups'] };
      this.lastOutcome = {
        foul: null,
        potted: [],
        continues: false,
        assigned: false,
        winner: this.rack.winner,
        message: snap.message,
      };
      this.phase = this.rack.winner >= 0 ? 'over' : 'aim';
      this.rested = true;
      return true;
    }
    const out = judgeShot(this.rack, this.before, this.balls, events, this.calledPocket);
    applyOutcome(this.rack, this.balls, out);
    this.lastOutcome = out;
    this.phase = this.rack.winner >= 0 ? 'over' : 'aim';
    this.rested = true;
    return true;
  }

  /** Skip the rest of a shot (fast-forward). */
  finishNow() {
    if (this.phase !== 'rolling') return;
    this.sim.runToRest();
    this.update(0);
  }

  drain(): ShotEvent[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }
}
