import { create } from 'zustand';

import { type Entity, type SimEvent, takenWords, type World } from '@arena/sim-runner';

import { getDriver } from '../match/runtime.ts';
import { LESSONS } from './lessons.ts';

const DONE_KEY = 'ruckus.runner.tutorialDone';
/** Pause on a passed lesson (s) so the win registers before the next one sets up. */
const PASS_HOLD_S = 1.6;
/** After a hit the lesson restarts this long later (s): long enough to see what happened. */
const MISS_RESET_S = 1.1;
/** A lesson's road starts this far up the course; far enough that the countdown road is empty. */
const START_M = 10;
/** Past the last obstacle by this much (m) counts as cleared. */
const CLEAR_M = 4;
/** A runner who never grabs the orb gets another go this far past it (m). */
const OVERSHOOT_M = 25;

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
  /** All six done: the card offers the real race. */
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
 * Stages each lesson's road on the live sim and judges it. The runner and physics are the real
 * ones; the director only lays the road, keeps the runner at the gentle opening speed, and judges.
 */
class TutorialDirector {
  private wait = 0;
  private missed = -1;
  private origin = 0;

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

  /** Lay the current lesson's road ahead of the runner (also the Reset button). */
  stage() {
    const d = getDriver();
    const l = LESSONS[useTutorial.getState().lesson];
    if (!d || !l) return;
    const w = d.world;
    const r = w.runners[0];
    if (!r) return;
    // Every lesson runs from the start of the road, so the speed stays the gentle 15 m/s.
    Object.assign(r, { s: 0, lane: 1, y: 0, vy: 0, grounded: true, platform: -1, ducking: false });
    Object.assign(r, { hitSlow: 0, invulnerable: 0, power: null, powerTicks: 0, cursor: 0 });
    this.origin = START_M;
    const road: Entity[] = l.road.map((e) => ({ ...e, s: e.s + START_M }));
    w.course = road;
    r.taken = new Uint32Array(takenWords(road));
    w.finishM = Number.POSITIVE_INFINITY;
    w.phase = 'run';
    this.wait = 0;
    this.missed = -1;
    d.resync();
    useTutorial.getState().set({ passed: false });
  }

  /** Per frame, after the sim stepped: judge the lesson. */
  update(w: World, events: readonly SimEvent[], dt: number) {
    const t = useTutorial.getState();
    const l = LESSONS[t.lesson];
    const r = w.runners[0];
    if (!l || !r || t.finished) return;
    // Coins are the lesson's, never a reason to wipe out.
    r.coins = Math.max(r.coins, 20);
    if (t.passed) {
      this.wait -= dt;
      if (this.wait > 0) return;
      const next = t.lesson + 1;
      if (next >= LESSONS.length) return this.finish();
      t.set({ lesson: next, note: null });
      this.stage();
      return;
    }
    if (this.missed >= 0) {
      this.missed += dt;
      if (this.missed > MISS_RESET_S) this.stage();
      return;
    }
    const hit = events.some((e) => e.kind === 'hit' && e.runner === 0 && !e.shielded);
    const last = Math.max(...l.road.map((e) => e.s)) + this.origin;
    const passed =
      l.goal === 'pickup'
        ? events.some((e) => e.kind === 'pickup' && e.runner === 0 && e.pickup === 'speed')
        : !hit && r.s > last + CLEAR_M;
    if (passed) {
      this.wait = PASS_HOLD_S;
      t.set({ passed: true, note: l.done });
    } else if (hit || (l.goal === 'pickup' && r.s > last + OVERSHOOT_M)) {
      this.missed = 0;
      t.set({ note: l.retry });
    }
  }
}

export const tutorial = new TutorialDirector();
