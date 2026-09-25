import {
  CUE_BALL,
  type Group,
  HEAD_STRING_X,
  isSolid,
  isStripe,
  onEight,
  onTable,
  STRIDE,
} from '@arena/sim-pool';

import { playStrike } from '../audio/sfx.ts';
import { aim } from './aim.ts';
import { thinkBot } from './bot.ts';
import { PoolDriver, type Seat } from './driver.ts';
import { usePool } from './store.ts';

/** A bot takes a human-looking beat before it shoots, and a moment after a rack ends. */
const BOT_THINK_MIN_MS = 700;
const EXHIBITION_BOT_THINK_MS = 350;
const NEXT_RACK_MS = 3_500;
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
  mode: 'exhibition' | 'match' = 'exhibition';
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
    return this.mode === 'match' && !this.driver.seats[this.driver.shooter].bot;
  }

  startExhibition() {
    this.mode = 'exhibition';
    this.timers = [];
    this.newRack(EXHIBITION_SEATS);
    usePool.getState().set({ status: 'off' });
  }

  startMatch(name: string) {
    this.mode = 'match';
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
    const d = this.driver;
    if (!this.humanTurn() || d.phase !== 'aim') return;
    const { calledPocket, mustCall } = usePool.getState();
    if (mustCall && calledPocket < 0) return;
    const power = Math.max(0.03, aim.power);
    d.shoot({ dx: aim.dx, dy: aim.dy, power, spinX: aim.spinX, spinY: aim.spinY }, calledPocket);
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

    const d = this.driver;
    d.update(dtS);
    if (d.takeRested()) this.sync(d.lastOutcome?.message ?? null);
    if (d.phase === 'over') return;
    if (d.phase === 'aim' && d.seats[d.shooter].bot && this.thinkingFor !== this.turnKey()) {
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
      // Show the bot's aim briefly (the cue swings round) before it strikes.
      aim.dx = decision.shot.dx;
      aim.dy = decision.shot.dy;
      d.applyBot(decision);
      playStrike(decision.shot.power, d.balls[CUE_BALL * STRIDE] ?? 0);
      usePool.getState().set({ thinking: false, rolling: true, message: null });
    });
  }

  /** Mirror rules state into the HUD store after each shot. */
  private sync(message: string | null) {
    this.turn += 1;
    const d = this.driver;
    const r = d.rack;
    const human = !d.seats[r.shooter].bot;
    const mustCall = human && d.phase === 'aim' && onEight(r, d.balls);
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
    });
    if (r.winner >= 0 && this.mode === 'exhibition') {
      this.after(NEXT_RACK_MS, () => this.newRack(EXHIBITION_SEATS));
    }
    // A fresh break: the breaker starts behind the head string.
    if (r.isBreak && onTable(d.balls, CUE_BALL)) d.placeCue(HEAD_STRING_X * 1.5, 0);
  }
}
