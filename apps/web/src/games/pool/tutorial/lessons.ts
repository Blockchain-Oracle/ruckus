import { BALL_RADIUS_M, HALF_L, HALF_W } from '@arena/sim-pool';

/**
 * Pool's hands-on lessons. Each stages its own table (only the balls it needs) and passes when the
 * player does the thing, with the real controls. Keyboard and touch wording differ.
 */
export type LessonId = 'aim' | 'pot' | 'draw' | 'inhand' | 'eight' | 'done';

type Spot = { ball: number; x: number; y: number };
export type Lesson = {
  id: LessonId;
  title: string;
  mouse: string;
  touch: string;
  /** Balls on the table (everything else starts in a pocket). */
  table: Spot[];
  ballInHand?: 'anywhere';
  /** Groups set and cleared, so the 8 is next and must be called. */
  onEight?: boolean;
};

const R = BALL_RADIUS_M;
/** A straight-in line to the top-right corner pocket. */
const corner = { x: HALF_L - 0.03, y: HALF_W - 0.03 };
const along = (t: number) => ({ x: corner.x - t * 0.707, y: corner.y - t * 0.707 });

/** The draw lesson's object ball and its line into the side pocket's mouth. */
export const DRAW_OBJECT = { x: 0.12, y: 0.3 } as const;
const toSide = { x: 0 - DRAW_OBJECT.x, y: HALF_W - DRAW_OBJECT.y };
const toSideLen = Math.hypot(toSide.x, toSide.y);
export const DRAW_DIR = { x: toSide.x / toSideLen, y: toSide.y / toSideLen } as const;

export const LESSONS: readonly Lesson[] = [
  {
    id: 'aim',
    title: 'Aim',
    mouse: 'Move the mouse to aim at the 1 ball. The ring shows where the cue ball will hit it.',
    touch: 'Drag on the table to aim at the 1 ball. The ring shows where the cue ball will hit it.',
    table: [
      { ball: 0, ...along(0.95) },
      { ball: 1, ...along(0.35) },
    ],
  },
  {
    id: 'pot',
    title: 'Shoot',
    mouse: 'Pull the cue down on the right and let go (or hold Space). Sink the 1!',
    touch: 'Pull the cue down on the right and let go. Sink the 1!',
    table: [
      { ball: 0, ...along(0.95) },
      { ball: 1, ...along(0.35) },
    ],
  },
  {
    id: 'draw',
    title: 'Spin',
    mouse:
      'Drag the red dot low on the spin ball for draw, then pot the 2. The cue ball comes back.',
    touch:
      'Drag the red dot low on the spin ball for draw, then pot the 2. The cue ball comes back.',
    // An angled line into the far side pocket, so drawing back doesn't run into the other one.
    table: [
      { ball: 0, x: DRAW_OBJECT.x - DRAW_DIR.x * 0.45, y: DRAW_OBJECT.y - DRAW_DIR.y * 0.45 },
      { ball: 2, ...DRAW_OBJECT },
    ],
  },
  {
    id: 'inhand',
    title: 'Ball in hand',
    mouse: 'After a foul the cue ball is yours to place. Drag it anywhere, then hit the 3.',
    touch: 'After a foul the cue ball is yours to place. Drag it anywhere, then hit the 3.',
    table: [
      { ball: 0, x: -HALF_L + 4 * R, y: -HALF_W + 4 * R },
      { ball: 3, x: HALF_L - 0.35, y: -HALF_W + 0.2 },
      { ball: 4, x: -0.2, y: -HALF_W + 0.28 },
    ],
    ballInHand: 'anywhere',
  },
  {
    id: 'eight',
    title: 'Call the 8',
    mouse: 'Your group is down. Tap the pocket you will sink the 8 in, then sink it there.',
    touch: 'Your group is down. Tap the pocket you will sink the 8 in, then sink it there.',
    table: [
      { ball: 0, x: -0.3, y: 0.1 },
      { ball: 8, x: 0.45, y: 0.1 },
    ],
    onEight: true,
  },
  {
    id: 'done',
    title: "You're ready",
    mouse: 'That is everything. Solids or stripes: first to clear them and call the 8 wins.',
    touch: 'That is everything. Solids or stripes: first to clear them and call the 8 wins.',
    table: [],
  },
];

export const POOL_TUTORIAL_DONE_KEY = 'ruckus.pool.tutorialDone';
export const LESSON_DONE_MS = 900;
export const FINAL_LESSON_MS = 3_200;
