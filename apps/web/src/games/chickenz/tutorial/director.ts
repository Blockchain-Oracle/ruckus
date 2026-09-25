import { create } from 'zustand';

import { ALIVE_FLAG, Button, P, playerBase, type Sim } from '@arena/sim-chickenz';

import type { ChickenzDriver } from '../sim/driver.ts';
import { FINAL_STEP_MS, MOVE_TICKS_TO_PASS, STEPS, TUTORIAL_DONE_KEY } from './steps.ts';

type TutorialState = { step: number; set(patch: Partial<Omit<TutorialState, 'set'>>): void };

/** -1 = not running. */
export const useTutorial = create<TutorialState>()((set) => ({
  step: -1,
  set: (patch) => set(patch),
}));

const STUDENT = 0;
const DUMMY = 1;

export const tutorialDone = () => {
  try {
    return window.localStorage.getItem(TUTORIAL_DONE_KEY) === '1';
  } catch {
    return false;
  }
};

export const markDone = () => {
  try {
    window.localStorage.setItem(TUTORIAL_DONE_KEY, '1');
  } catch {
    /* not remembered: the prompt will simply offer the tutorial again */
  }
};

/**
 * Drives the lessons on a local sandbox sim (no network), exactly like Chickenz: each tick checks
 * the current step's condition from the student's input and the view, and stages the dummy bird
 * for the stomp and kill lessons.
 */
export class TutorialDirector {
  private driver: ChickenzDriver;
  private moveTicks = 0;
  private staged = false;
  private autoTimer = 0;
  onComplete?: () => void;

  constructor(driver: ChickenzDriver) {
    this.driver = driver;
  }

  get active() {
    return useTutorial.getState().step >= 0;
  }

  start() {
    this.moveTicks = 0;
    this.staged = false;
    this.driver.setMode({ kind: 'tutorial', seed: 1 });
    this.driver.frozen = false;
    this.driver.beforeStep = (sim, input) => this.tick(sim, input.buttons);
    useTutorial.getState().set({ step: 0 });
  }

  stop() {
    window.clearTimeout(this.autoTimer);
    this.driver.beforeStep = undefined;
    useTutorial.getState().set({ step: -1 });
  }

  skip() {
    markDone();
    this.stop();
    this.onComplete?.();
  }

  private advance() {
    const next = useTutorial.getState().step + 1;
    this.staged = false;
    if (next >= STEPS.length) {
      this.skip();
      return;
    }
    useTutorial.getState().set({ step: next });
    if (STEPS[next]?.condition === 'auto') {
      window.clearTimeout(this.autoTimer);
      this.autoTimer = window.setTimeout(() => this.advance(), FINAL_STEP_MS);
    }
  }

  private tick(sim: Sim, buttons: number) {
    const step = STEPS[useTutorial.getState().step];
    if (!step) return;
    const v = this.driver.curr;
    const me = playerBase(STUDENT);
    const dummy = playerBase(DUMMY);
    const bench = () => sim.tutorial_banish(DUMMY);

    switch (step.condition) {
      case 'movement':
        bench();
        if (buttons & (Button.Left | Button.Right)) this.moveTicks += 1;
        if (this.moveTicks >= MOVE_TICKS_TO_PASS) this.advance();
        return;
      case 'jump':
        bench();
        if (buttons & Button.Jump) this.advance();
        return;
      case 'double_jump':
        bench();
        if ((v[me + P.jumpsLeft] ?? 1) === 0 && !v[me + P.grounded]) this.advance();
        return;
      case 'weapon':
        bench();
        if ((v[me + P.weapon] ?? -1) >= 0) this.advance();
        return;
      case 'shoot':
        bench();
        if (buttons & Button.Shoot) this.advance();
        return;
      case 'stomp_escape':
        if (!this.staged) {
          sim.tutorial_stomp(STUDENT, DUMMY);
          this.staged = true;
          return;
        }
        sim.tutorial_pin_health(STUDENT);
        if ((v[me + P.stompedBy] ?? -1) < 0) this.advance();
        return;
      case 'kill':
        if (!this.staged) {
          sim.tutorial_kill(STUDENT, DUMMY);
          this.staged = true;
          return;
        }
        if (!((v[dummy + P.flags] ?? 0) & ALIVE_FLAG)) this.advance();
        return;
      case 'auto':
        bench();
        return;
    }
  }
}
