import { create } from 'zustand';

import {
  MATCH_SECONDS,
  PLAYER_RADIUS,
  playerRadius,
  type SimEvent,
  TICK_HZ,
  type World,
} from '@arena/sim-soccer';

import { getDriver } from '../match/runtime.ts';
import { LESSONS } from './lessons.ts';

const DONE_KEY = 'ruckus.soccer.tutorialDone';
/** Pause on a passed lesson (s) so the win registers before the next one sets up. */
const PASS_HOLD_S = 1.6;
/** A missed header or shot resets after the ball settles this long (s). */
const MISS_RESET_S = 1.2;
/** Ball speed (px/s) below which a ball on the grass counts as settled. */
const SETTLED_SPEED = 40;
/** How close (px) your egg's centre must come to a ring. */
const REACH_PX = 60;
/** Parked out of play above the left goal: the sim needs a second egg, the lesson doesn't. */
const PARK = { x: -580, y: 820 } as const;
const NEVER = 1e9;

export const tutorialDone = () => {
  try {
    return window.localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
};
const markDone = () => {
  try {
    window.localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* offered again next visit */
  }
};

type TutorialState = {
  lesson: number;
  /** Coaching line under the lesson (a pass, or a hint after a miss). */
  note: string | null;
  passed: boolean;
  /** All five done: the card offers the real match. */
  finished: boolean;
  set(patch: Partial<Omit<TutorialState, 'set'>>): void;
};
export const useTutorial = create<TutorialState>()((set) => ({
  lesson: -1,
  note: null,
  passed: false,
  finished: false,
  set: (patch) => set(patch),
}));

/**
 * Stages each lesson on the live sim and watches for its goal. The world is the real one (same
 * physics as a match); the director only places things, pins the clock, and judges.
 */
class TutorialDirector {
  private wait = 0;
  private settled = 0;

  get active() {
    return useTutorial.getState().lesson >= 0;
  }

  start() {
    const d = getDriver();
    if (!d) return;
    d.startTutorial();
    useTutorial.getState().set({ lesson: 0, note: null, passed: false, finished: false });
    this.stage();
  }

  stop() {
    useTutorial.getState().set({ lesson: -1, note: null, passed: false, finished: false });
  }

  finish() {
    markDone();
    useTutorial.getState().set({ finished: true, passed: true, note: null });
  }

  /** Put the current lesson's pieces in place (also the Reset button). */
  stage() {
    const d = getDriver();
    const l = LESSONS[useTutorial.getState().lesson];
    if (!d || !l) return;
    const w = d.world;
    const [you, dummy] = w.players;
    if (!you || !dummy) return;
    Object.assign(you, { x: l.stage.you.x, y: PLAYER_RADIUS, vx: 0, vy: 0, facing: 1 });
    Object.assign(you, { onGround: true, speed: 0, grow: 0, shrink: 0, frozen: 0 });
    this.park(w);
    w.ball = {
      x: l.stage.ball.x,
      y: l.stage.ball.y,
      vx: l.stage.ball.vx ?? 0,
      vy: l.stage.ball.vy ?? 0,
    };
    w.lastTouch = -1;
    w.ballGrow = w.ballShrink = w.ballBouncy = 0;
    w.powerUp = l.stage.bubble ? { ...l.stage.bubble, life: NEVER } : null;
    w.spawnTicks = NEVER;
    w.phase = 'play';
    w.phaseTicks = 0;
    w.score = [0, 0];
    this.wait = 0;
    this.settled = 0;
    d.resync();
    useTutorial.getState().set({ passed: false });
  }

  private park(w: World) {
    const dummy = w.players[1];
    if (dummy) Object.assign(dummy, { x: PARK.x, y: PARK.y, vx: 0, vy: 0, bot: -1 });
  }

  /** Per frame, after the sim stepped: keep the stage honest and judge the lesson. */
  update(w: World, events: readonly SimEvent[], dt: number) {
    const t = useTutorial.getState();
    const l = LESSONS[t.lesson];
    if (!l || t.finished) return;
    w.clock = MATCH_SECONDS * TICK_HZ;
    this.park(w);
    if (t.passed) {
      this.wait -= dt;
      if (this.wait > 0) return;
      const next = t.lesson + 1;
      if (next >= LESSONS.length) return this.finish();
      t.set({ lesson: next, note: null });
      this.stage();
      return;
    }
    const you = w.players[0];
    if (!you) return;
    if (this.judge(l.goal, w, events)) {
      this.wait = PASS_HOLD_S;
      t.set({ passed: true, note: l.done });
      return;
    }
    // A shot or header that came to nothing: set it up again with a hint.
    if (l.goal === 'goal' || l.goal === 'header' || l.goal === 'powerup') {
      const b = w.ball;
      const resting = b.y < 30 && Math.hypot(b.vx, b.vy) < SETTLED_SPEED && w.lastTouch >= 0;
      const dropped = l.goal === 'header' && b.y < 30;
      const afterGoal = w.phase !== 'play';
      this.settled = resting || dropped || afterGoal ? this.settled + dt : 0;
      if (this.settled > MISS_RESET_S) {
        t.set({ note: l.retry ?? null });
        this.stage();
      }
    }
  }

  private judge(goal: (typeof LESSONS)[number]['goal'], w: World, events: readonly SimEvent[]) {
    const you = w.players[0];
    if (!you) return false;
    const l = LESSONS[useTutorial.getState().lesson];
    if (goal === 'reach') {
      const tg = l?.stage.target;
      return Boolean(
        tg && Math.hypot(you.x - tg.x, you.y - tg.y) < REACH_PX + playerRadius(you) * 0.3,
      );
    }
    if (goal === 'goal') return events.some((e) => e.kind === 'goal' && e.team === 0);
    if (goal === 'powerup') return events.some((e) => e.kind === 'powerup' && e.player === 0);
    // A header: the ball meets the top of the egg (above its middle).
    return events.some(
      (e) => e.kind === 'kick' && e.player === 0 && w.ball.y > you.y + playerRadius(you) * 0.45,
    );
  }
}

export const tutorial = new TutorialDirector();
