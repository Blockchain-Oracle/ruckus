import {
  BALL_RADIUS_M,
  CUE_BALL,
  EIGHT_BALL,
  F,
  HALF_L,
  HALF_W,
  newBalls,
  ON_TABLE,
  type RackState,
  type ShotEvent,
  STRIDE,
  set,
} from '@arena/sim-pool';

import { castAim } from '../render/AimGuide.tsx';
import {
  DRAW_DIR,
  DRAW_OBJECT,
  FINAL_LESSON_MS,
  LESSON_DONE_MS,
  LESSONS,
  POOL_TUTORIAL_DONE_KEY,
} from '../tutorial/lessons.ts';
import { aim } from './aim.ts';
import type { PoolDriver } from './driver.ts';
import { usePool } from './store.ts';

/** Straight-in aim for lesson 1 passes within this much of the pocket line (cosine). */
const AIM_TOLERANCE = 0.9985;
/** Draw lesson: the cue ball must finish at least this far back from where it met the 2 (m). */
const DRAW_BACK_M = 0.18;

export const tutorialDone = () => {
  try {
    return window.localStorage.getItem(POOL_TUTORIAL_DONE_KEY) === '1';
  } catch {
    return false;
  }
};
export const markTutorialDone = () => {
  try {
    window.localStorage.setItem(POOL_TUTORIAL_DONE_KEY, '1');
  } catch {
    /* the prompt will simply offer it again */
  }
};

/** Put a lesson's table on the cloth and hand the student the cue. */
export function stageLesson(d: PoolDriver, index: number) {
  const lesson = LESSONS[index];
  if (!lesson) return;
  const b = newBalls();
  for (let i = 0; i < 16; i++) set(b, i, F.pocket, 0);
  for (const s of lesson.table) {
    set(b, s.ball, F.pocket, ON_TABLE);
    set(b, s.ball, F.x, s.x);
    set(b, s.ball, F.y, s.y);
  }
  const rack: RackState = {
    shooter: 0,
    groups: lesson.onEight ? ['solids', 'stripes'] : [null, null],
    isBreak: false,
    ballInHand: lesson.ballInHand ?? 'none',
    winner: -1,
  };
  d.load(b, rack);
  d.sandbox = true;
  // Start the aim somewhere sensible but not already on target (lesson 1 is finding it).
  aim.dx = 1;
  aim.dy = 0.25;
  aim.power = 0;
  aim.spinX = 0;
  aim.spinY = 0;
  usePool.getState().set({ lesson: index, lessonNote: null, calledPocket: -1 });
}

/** Lesson 1 passes the moment the aim line would send the 1 into the corner. */
export function aimLessonPassed(d: PoolDriver) {
  const c = castAim(d.balls, aim.dx, aim.dy);
  if (c.target !== 1) return false;
  // Direction from the 1 to the corner pocket against where the cue ball would send it.
  const tx = HALF_L - (d.balls[1 * STRIDE + F.x] ?? 0);
  const ty = HALF_W - (d.balls[1 * STRIDE + F.y] ?? 0);
  const l = Math.hypot(tx, ty);
  return (tx / l) * c.ox + (ty / l) * c.oy > AIM_TOLERANCE;
}

/** After a lesson shot rests: passed, or what to tell the student before trying again. */
export function judgeLesson(
  index: number,
  d: PoolDriver,
  events: readonly ShotEvent[],
): true | string {
  const id = LESSONS[index]?.id;
  const potted = events.filter((e) => e.kind === 'pocket').map((e) => e.a);
  const firstHit = events.find((e) => e.kind === 'ball' && (e.a === CUE_BALL || e.b === CUE_BALL));
  const hit =
    firstHit && firstHit.kind === 'ball' ? (firstHit.a === CUE_BALL ? firstHit.b : firstHit.a) : -1;
  if (potted.includes(CUE_BALL)) return 'The cue ball went in. Softer, and try again.';
  switch (id) {
    case 'aim':
    case 'pot':
      return potted.includes(1)
        ? true
        : hit === 1
          ? 'Close! Line up the ring and try again.'
          : 'Aim at the 1 ball.';
    case 'draw': {
      if (!potted.includes(2)) return 'Pot the 2 (aim straight at it).';
      // Contact was 2R short of the 2 on its line; the cue ball must finish back behind that point.
      const gx = DRAW_OBJECT.x - 2 * BALL_RADIUS_M * DRAW_DIR.x;
      const gy = DRAW_OBJECT.y - 2 * BALL_RADIUS_M * DRAW_DIR.y;
      const cx = (d.balls[CUE_BALL * STRIDE + F.x] ?? 0) - gx;
      const cy = (d.balls[CUE_BALL * STRIDE + F.y] ?? 0) - gy;
      return cx * DRAW_DIR.x + cy * DRAW_DIR.y < -DRAW_BACK_M
        ? true
        : 'Pull the red dot lower for more draw.';
    }
    case 'inhand':
      return hit === 3 ? true : 'Place the cue ball with a clear line to the 3.';
    case 'eight': {
      const eight = events.find((e) => e.kind === 'pocket' && e.a === EIGHT_BALL);
      if (!eight || eight.kind !== 'pocket') return 'Sink the 8 in the pocket you called.';
      return eight.pocket === usePool.getState().calledPocket
        ? true
        : 'Wrong pocket: in a game that loses. Try again.';
    }
    default:
      return true;
  }
}

export const LESSON_TIMINGS = { passMs: LESSON_DONE_MS, finalMs: FINAL_LESSON_MS } as const;
export const lessonCount = LESSONS.length;
