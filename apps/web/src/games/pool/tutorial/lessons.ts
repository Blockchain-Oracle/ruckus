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
    mouse:
      'Click on the table (or drag) to point the cue at the 1 ball. The ring shows where the cue ball will hit it. Moving the mouse away keeps your aim; ←/→ fine-tune it.',
    touch:
      'Tap or drag on the table to point the cue at the 1 ball. The ring shows where the cue ball will hit it.',
    table: [
      { ball: 0, ...along(0.95) },
      { ball: 1, ...along(0.35) },
    ],
  },
  {
    id: 'pot',
    title: 'Shoot',
    mouse:
      'Grab the cue on the right, pull it down and let go to shoot. Or hold Space and release. Sink the 1!',
    touch: 'Grab the cue on the right, pull it down and let go to shoot. Sink the 1!',
    table: [
      { ball: 0, ...along(0.95) },
      { ball: 1, ...along(0.35) },
    ],
  },
  {
    id: 'draw',
    title: 'Spin',
    mouse:
      'Drag the red dot to the bottom of the white ball (bottom left) for draw, then pot the 2. The cue ball comes back.',
    touch:
      'Drag the red dot to the bottom of the white ball (bottom left) for draw, then pot the 2. The cue ball comes back.',
    // An angled line into the far side pocket, so drawing back doesn't run into the other one.
    table: [
      { ball: 0, x: DRAW_OBJECT.x - DRAW_DIR.x * 0.45, y: DRAW_OBJECT.y - DRAW_DIR.y * 0.45 },
      { ball: 2, ...DRAW_OBJECT },
    ],
  },
  {
    id: 'inhand',
    title: 'Ball in hand',
    mouse:
      'After a foul the cue ball is yours: drag the white ball anywhere, then aim at the 3 and shoot.',
    touch:
      'After a foul the cue ball is yours: drag the white ball anywhere, then aim at the 3 and shoot.',
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
    mouse:
      'Your group is down, so the 8 is next. Click (or tap) the glowing ring on the pocket you want, then sink the 8 there.',
    touch:
      'Your group is down, so the 8 is next. Click (or tap) the glowing ring on the pocket you want, then sink the 8 there.',
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
