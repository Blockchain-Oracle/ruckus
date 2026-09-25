import type { PlayedEvent, RackEvent, ShotRequest } from '@arena/protocol/pool';
import {
  CUE_BALL,
  type Group,
  HEAD_STRING_X,
  isSolid,
  isStripe,
  layout,
  onEight,
  onTable,
  type RackState,
  type Shot,
  STRIDE,
} from '@arena/sim-pool';

import { playStrike } from '../audio/sfx.ts';
import { LESSONS } from '../tutorial/lessons.ts';
import { useShotBet } from '../wager/store.ts';
import { aim } from './aim.ts';
import { thinkBot } from './bot.ts';
import { PoolDriver, type Seat } from './driver.ts';
import { usePool } from './store.ts';
import {
  aimLessonPassed,
  judgeLesson,
  LESSON_TIMINGS,
  lessonCount,
  markTutorialDone,
  stageLesson,
} from './tutorial.ts';

/** A bot takes a human-looking beat before it shoots, and a moment after a rack ends. */
const BOT_THINK_MIN_MS = 700;
const EXHIBITION_BOT_THINK_MS = 350;
const NEXT_RACK_MS = 3_500;
const STROKE = { swingMs: 650, drawMs: 450, holdMs: 180 } as const;
export const PRACTICE_BOT = { name: 'Bot · Shark', difficulty: 70 } as const;
const EXHIBITION_SEATS: [Seat, Seat] = [
  { name: 'Bot · Minnesota', bot: true, difficulty: 80 },
  { name: 'Bot · Fast Eddie', bot: true, difficulty: 85 },
];

const leftOf = (d: PoolDriver, g: Group | null) => {
  if (!g) return null;
  let n = 0;
  for (let i = 1; i <= 15; i++)
    if (onTable(d.balls, i) && (g === 'solids' ? isSolid(i) : isStripe(i))) n++;
  return n;
};

/**
 * Runs Pool: a looping bot exhibition behind the hub, or a human match. The driver owns physics
 * and rules; this decides whose turn it is, asks the bot, and mirrors state into the HUD store.
 */
export class PoolDirector {
  driver: PoolDriver;
  mode: 'exhibition' | 'match' | 'online' | 'tutorial' | 'wager' = 'exhibition';
  private lesson = -1;
  /** Dev-only timeline for browser checks (never read in production). */
  log: string[] = [];
  private trace(line: string) {
    if (import.meta.env.DEV) this.log.push(`${Math.round(this.clock)} ${line}`);
  }
  /** Online: my seat (0/1), or −1 when watching. */
  mySlot = 0;
  private sendShot: ((req: ShotRequest) => void) | null = null;
  private seedBase: number;
  private racks = 0;
  private thinkingFor = -1;
  private timers: { at: number; run: () => void }[] = [];
  private clock = 0;

  constructor(seed: number) {
    this.seedBase = seed;
    this.driver = new PoolDriver(seed, EXHIBITION_SEATS, 0);
  }

  humanTurn() {
    if (this.mode === 'wager')
      return this.driver.phase === 'aim' && useShotBet.getState().phase === 'setup';
    if (this.mode === 'tutorial') return this.lesson >= 0;
    if (this.mode === 'online') return this.driver.shooter === this.mySlot;
    return this.mode === 'match' && !this.driver.seats[this.driver.shooter].bot;
  }

  // ── Call Your Shot (wager) ───────────────────────────────────────────────

  /** A fresh practice layout to call a shot on. */
  startWager(seed: number) {
    this.mode = 'wager';
    this.timers = [];
    this.stroke = null;
    this.driver = new PoolDriver(seed, [
      { name: 'You', bot: false, difficulty: 0 },
      { name: 'The house', bot: false, difficulty: 0 },
    ]);
    this.driver.load(layout(seed), {
      shooter: 0,
      groups: [null, null],
      isBreak: false,
      ballInHand: 'none',
      winner: -1,
    });
    this.driver.sandbox = true;
    aim.power = 0;
    aim.spinX = 0;
    aim.spinY = 0;
    this.sync(null);
    usePool.getState().set({ status: 'off' });
    useShotBet.getState().set({ phase: 'setup', layoutSeed: seed, result: null, call: null });
  }

  private wagerDone: (() => void) | null = null;
  /** Play the realised stroke; `done` fires when everything stops. */
  playWagerShot(shot: Shot, done: () => void) {
    this.wagerDone = done;
    this.driver.shoot(shot, -1);
    playStrike(shot.power, this.driver.balls[CUE_BALL * STRIDE] ?? 0);
  }

  // ── tutorial ───────────────────────────────────────────────────────────

  startTutorial() {
    this.mode = 'tutorial';
    this.timers = [];
    this.stroke = null;
    this.driver = new PoolDriver(1, [
      { name: 'You', bot: false, difficulty: 0 },
      { name: 'Coach', bot: false, difficulty: 0 },
    ]);
    this.gotoLesson(0);
    usePool.getState().set({ status: 'playing', winner: -1, offerTutorial: false });
  }

  private gotoLesson(index: number) {
    this.lesson = index;
    stageLesson(this.driver, index);
    this.sync(null);
    usePool.getState().set({ lesson: index });
    if (index === lessonCount - 1) this.after(LESSON_TIMINGS.finalMs, () => this.finishTutorial());
  }

  finishTutorial() {
    markTutorialDone();
    this.lesson = -1;
    usePool.getState().set({ lesson: -1, lessonNote: null });
    this.startMatch(this.playerName);
  }

  /** The name to seat the human under (set by the scene from the profile). */
  playerName = 'You';

  private tutorialTick() {
    const d = this.driver;
    const id = LESSONS[this.lesson]?.id;
    // Lesson 1 passes on the aim alone; it moves on to shooting the same table.
    if (id === 'aim' && d.phase === 'aim' && aimLessonPassed(d)) {
      this.lesson = -2;
      this.after(LESSON_TIMINGS.passMs, () => {
        const keep = { dx: aim.dx, dy: aim.dy };
        this.gotoLesson(1);
        aim.dx = keep.dx;
        aim.dy = keep.dy;
      });
    }
  }

  private tutorialRested() {
    const index = this.lesson;
    if (index < 0) return;
    const verdict = judgeLesson(index, this.driver, this.driver.sim.events);
    if (verdict === true) {
      this.lesson = -2;
      usePool.getState().set({ lessonNote: 'Nice!' });
      this.after(LESSON_TIMINGS.passMs, () => this.gotoLesson(index + 1));
    } else {
      this.after(LESSON_TIMINGS.passMs, () => {
        this.gotoLesson(index);
        usePool.getState().set({ lessonNote: verdict });
      });
    }
  }

  // ── online (server-refereed lockstep) ───────────────────────────────────

  /** A rack from the room: build the identical table (or load one mid-rack as a watcher). */
  startOnline(e: RackEvent, balls: Float64Array, mySlot: number, send: (req: ShotRequest) => void) {
    this.trace(`online rack seed=${e.seed} slot=${mySlot} shooter=${e.rack.shooter}`);
    this.mode = 'online';
    this.playedQueue = [];
    this.mySlot = mySlot;
    this.sendShot = send;
    this.timers = [];
    this.stroke = null;
    const seats: [Seat, Seat] = [
      { name: e.names[0], bot: e.bots[0], difficulty: 0 },
      { name: e.names[1], bot: e.bots[1], difficulty: 0 },
    ];
    this.driver = new PoolDriver(e.seed, seats, e.breaker);
    this.driver.remote = true;
    this.driver.load(balls, e.rack as RackState);
    this.sync(null);
  }

  /** Shots that arrived while the previous one was still rolling (or a bot stroke was playing). */
  private playedQueue: { e: PlayedEvent; before: Float64Array; after: Float64Array }[] = [];

  /** The server played a shot: queue it, and play it once the table is free. */
  onlinePlayed(e: PlayedEvent, before: Float64Array, after: Float64Array) {
    this.trace(
      `played by ${e.shooter}${e.bot ? ' bot' : ''} phase=${this.driver.phase} q=${this.playedQueue.length}`,
    );
    if (this.mode !== 'online') return;
    const d = this.driver;
    // My own shot is already rolling locally: only its snap was needed.
    if (
      e.shooter === this.mySlot &&
      !e.bot &&
      d.phase === 'rolling' &&
      this.playedQueue.length === 0
    ) {
      d.setSnap(after, e.rack as RackState, e.message);
      return;
    }
    this.playedQueue.push({ e, before, after });
    this.nextPlayed();
  }

  private nextPlayed() {
    const d = this.driver;
    if (d.phase === 'rolling' || this.stroke) return;
    const next = this.playedQueue.shift();
    if (next) this.playOnline(next.e, next.before, next.after);
  }

  private playOnline(e: PlayedEvent, before: Float64Array, after: Float64Array) {
    const d = this.driver;
    d.setSnap(after, e.rack as RackState, e.message);
    const { shot, calledPocket } = e.request;
    if (e.bot) {
      if (e.request.place) d.placeCue(e.request.place.x, e.request.place.y);
      this.playStroke(shot, () => {
        d.replay(before, shot, calledPocket);
        playStrike(shot.power, before[CUE_BALL * STRIDE] ?? 0);
      });
    } else {
      d.replay(before, shot, calledPocket);
      playStrike(shot.power, before[CUE_BALL * STRIDE] ?? 0);
    }
    usePool.getState().set({ rolling: true, message: null, thinking: false });
  }

  /** Another player's live aim (watching their cue move). */
  remoteAim(a: { dx: number; dy: number; power: number; spinX: number; spinY: number }) {
    if (this.humanTurn() || this.stroke) return;
    aim.dx = a.dx;
    aim.dy = a.dy;
    aim.power = a.power;
    aim.spinX = a.spinX;
    aim.spinY = a.spinY;
  }

  onlineOver(winner: 0 | 1) {
    this.trace(`over ${winner}`);
    usePool.getState().set({ status: 'over', winner });
  }

  startExhibition() {
    this.trace('exhibition');
    if (useShotBet.getState().phase !== 'off') useShotBet.getState().set({ phase: 'off' });
    this.mode = 'exhibition';
    this.lesson = -1;
    usePool.getState().set({ lesson: -1, lessonNote: null, offerTutorial: false });
    this.timers = [];
    this.newRack(EXHIBITION_SEATS);
    usePool.getState().set({ status: 'off' });
  }

  startMatch(name: string) {
    this.mode = 'match';
    this.lesson = -1;
    this.timers = [];
    this.newRack([
      { name, bot: false, difficulty: 0 },
      { name: PRACTICE_BOT.name, bot: true, difficulty: PRACTICE_BOT.difficulty },
    ]);
    usePool.getState().set({ status: 'playing', winner: -1 });
  }

  rematch() {
    const [a, b] = this.driver.seats;
    // Alternate the break.
    this.newRack([b, a].map((s) => ({ ...s })) as [Seat, Seat]);
    usePool.getState().set({ status: 'playing', winner: -1 });
  }

  private newRack(seats: [Seat, Seat]) {
    this.racks += 1;
    this.stroke = null;
    const seed = Math.imul(this.seedBase ^ this.racks, 2654435761) >>> 0;
    this.driver = new PoolDriver(seed, seats, 0);
    this.thinkingFor = -1;
    aim.dx = 1;
    aim.dy = 0;
    aim.power = 0;
    aim.spinX = 0;
    aim.spinY = 0;
    this.sync(null);
  }

  private after(ms: number, run: () => void) {
    this.timers.push({ at: this.clock + ms, run });
  }

  /** Human shot from the HUD/input. */
  shootHuman() {
    // Calling a shot bets it; the cue itself never fires the stroke.
    if (this.mode === 'wager') return;
    const d = this.driver;
    if (!this.humanTurn() || d.phase !== 'aim') return;
    const { calledPocket, mustCall } = usePool.getState();
    if (mustCall && calledPocket < 0) return;
    const power = Math.max(0.03, aim.power);
    const shot = { dx: aim.dx, dy: aim.dy, power, spinX: aim.spinX, spinY: aim.spinY };
    if (this.mode === 'online') {
      const place =
        d.rack.ballInHand !== 'none'
          ? { x: d.balls[CUE_BALL * STRIDE] ?? 0, y: d.balls[CUE_BALL * STRIDE + 1] ?? 0 }
          : null;
      this.sendShot?.({ shot, place, calledPocket });
    }
    d.shoot(shot, calledPocket);
    playStrike(power, d.balls[CUE_BALL * STRIDE] ?? 0);
    aim.power = 0;
    usePool.getState().set({ rolling: true, message: null });
  }

  /** Can the human drag the cue ball right now? */
  canPlace() {
    return (
      this.humanTurn() && this.driver.phase === 'aim' && this.driver.rack.ballInHand !== 'none'
    );
  }

  tick(dtS: number) {
    this.clock += dtS * 1000;
    const due = this.timers.filter((t) => t.at <= this.clock);
    this.timers = this.timers.filter((t) => t.at > this.clock);
    for (const t of due) t.run();

    this.advanceStroke(dtS);
    const d = this.driver;
    d.update(dtS);
    if (this.mode === 'wager') {
      if (d.takeRested()) {
        const done = this.wagerDone;
        this.wagerDone = null;
        done?.();
      }
      return;
    }
    if (this.mode === 'tutorial') {
      if (d.takeRested()) this.tutorialRested();
      else this.tutorialTick();
      return;
    }
    if (d.takeRested()) this.sync(d.lastOutcome?.message ?? null);
    if (this.mode === 'online') this.nextPlayed();
    if (d.phase === 'over') return;
    // Online bots are the server's; it sends their shots.
    if (
      this.mode !== 'online' &&
      d.phase === 'aim' &&
      d.seats[d.shooter].bot &&
      this.thinkingFor !== this.turnKey()
    ) {
      this.thinkingFor = this.turnKey();
      this.botTurn();
    }
  }

  /** Bumped every time a turn begins, so each bot turn is asked for exactly once. */
  private turn = 0;
  private turnKey() {
    return this.turn;
  }

  private async botTurn() {
    const d = this.driver;
    const seat = d.seats[d.shooter];
    usePool.getState().set({ thinking: true });
    const started = this.clock;
    const decision = await thinkBot(
      d.balls,
      d.rack,
      seat.difficulty,
      (d.seed ^ Math.imul(this.turn, 7919)) >>> 0,
    );
    if (d !== this.driver) return;
    const wait = Math.max(
      0,
      (this.mode === 'match' ? BOT_THINK_MIN_MS : EXHIBITION_BOT_THINK_MS) - (this.clock - started),
    );
    this.after(wait, () => {
      if (d !== this.driver || d.phase !== 'aim') return;
      if (decision.place) d.placeCue(decision.place.x, decision.place.y);
      usePool.getState().set({ thinking: false });
      this.playStroke(decision.shot, () => {
        d.applyBot(decision);
        playStrike(decision.shot.power, d.balls[CUE_BALL * STRIDE] ?? 0);
        usePool.getState().set({ rolling: true, message: null });
      });
    });
  }

  /** Like a player: swing the cue onto the line, draw back, pause, strike. */
  private playStroke(shot: Shot, strike: () => void) {
    const from = Math.atan2(aim.dy, aim.dx);
    let to = Math.atan2(shot.dy, shot.dx);
    if (to - from > Math.PI) to -= 2 * Math.PI;
    if (from - to > Math.PI) to += 2 * Math.PI;
    const saved = { spinX: aim.spinX, spinY: aim.spinY };
    aim.spinX = shot.spinX;
    aim.spinY = shot.spinY;
    this.stroke = {
      from,
      to,
      t: 0,
      power: shot.power,
      strike: () => {
        aim.power = 0;
        aim.spinX = saved.spinX;
        aim.spinY = saved.spinY;
        strike();
      },
    };
  }

  /** The bot's visible stroke: swing (ms), draw back, hold, strike. */
  private stroke: {
    from: number;
    to: number;
    t: number;
    power: number;
    strike: () => void;
  } | null = null;
  private advanceStroke(dtS: number) {
    const s = this.stroke;
    if (!s) return;
    const fast = this.mode === 'exhibition' ? 0.6 : 1;
    s.t += (dtS * 1000) / fast;
    const swing = Math.min(1, s.t / STROKE.swingMs);
    const ease = swing * swing * (3 - 2 * swing);
    const a = s.from + (s.to - s.from) * ease;
    aim.dx = Math.cos(a);
    aim.dy = Math.sin(a);
    const drawT = (s.t - STROKE.swingMs) / STROKE.drawMs;
    aim.power = drawT <= 0 ? 0 : Math.min(1, drawT) * s.power;
    if (s.t >= STROKE.swingMs + STROKE.drawMs + STROKE.holdMs) {
      this.stroke = null;
      s.strike();
    }
  }

  /** Mirror rules state into the HUD store after each shot. */
  private sync(message: string | null) {
    this.turn += 1;
    this.trace(
      `sync shooter=${this.driver.rack.shooter} phase=${this.driver.phase} winner=${this.driver.rack.winner}`,
    );
    const d = this.driver;
    const r = d.rack;
    const mine = this.humanTurn();
    const mustCall = mine && d.phase === 'aim' && onEight(r, d.balls);
    usePool.getState().set({
      names: [d.seats[0].name, d.seats[1].name],
      bots: [d.seats[0].bot, d.seats[1].bot],
      shooter: r.shooter,
      groups: [...r.groups] as [Group | null, Group | null],
      left: [leftOf(d, r.groups[0]), leftOf(d, r.groups[1])],
      message,
      ballInHand: r.ballInHand,
      mustCall,
      calledPocket: -1,
      winner: r.winner,
      rolling: false,
      thinking: false,
      potted: Array.from({ length: 15 }, (_, k) => k + 1).filter((n) => !onTable(d.balls, n)),
      status: this.mode === 'exhibition' ? 'off' : r.winner >= 0 ? 'over' : 'playing',
      mySlot: this.mode === 'online' ? this.mySlot : this.mode === 'exhibition' ? -1 : 0,
      myTurn: mine && d.phase === 'aim',
    });
    if (r.winner >= 0 && this.mode === 'exhibition') {
      this.after(NEXT_RACK_MS, () => this.newRack(EXHIBITION_SEATS));
    }
    // A fresh break: the breaker starts behind the head string (online, the server's table rules).
    if (this.mode !== 'online' && r.isBreak && onTable(d.balls, CUE_BALL))
      d.placeCue(HEAD_STRING_X * 1.5, 0);
  }
}
