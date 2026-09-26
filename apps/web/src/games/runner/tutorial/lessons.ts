import type { Entity } from '@arena/sim-runner';

export type LessonGoal = 'clear' | 'pickup';

export type Lesson = {
  title: string;
  mouse: string;
  touch: string;
  goal: LessonGoal;
  /** The lesson's road, in metres from the runner's start (the director shifts it). */
  road: readonly Entity[];
  done: string;
  retry: string;
};

/**
 * Six hands-on lessons on the live sim, in the order the barrier grammar teaches itself: change
 * lanes, jump, duck, the duck-only purple, the air slam, then orbs. A hit restarts the lesson.
 */
export const LESSONS: readonly Lesson[] = [
  {
    title: 'Change lanes',
    mouse: 'Red walls are too tall to jump. Step aside with A / D or ← →.',
    touch: 'Red walls are too tall to jump. Swipe left or right to change lanes.',
    goal: 'clear',
    road: [{ kind: 'barrier', s: 45, barrier: 'moveSingle', lanes: 0b010 }],
    done: 'Clean dodge!',
    retry: 'Red means move: change lanes before it reaches you.',
  },
  {
    title: 'Jump',
    mouse: 'Cyan hurdles: jump them with W, ↑ or Space.',
    touch: 'Cyan hurdles: swipe up to jump them.',
    goal: 'clear',
    road: [{ kind: 'barrier', s: 45, barrier: 'jumpFull', lanes: 0b111 }],
    done: 'Over it!',
    retry: 'Cyan means jump: take off a moment before it arrives.',
  },
  {
    title: 'Duck',
    mouse: 'Yellow bars: hold S or ↓ to slide under them.',
    touch: 'Yellow bars: swipe down to slide under them.',
    goal: 'clear',
    road: [{ kind: 'barrier', s: 45, barrier: 'duckFull', lanes: 0b111 }],
    done: 'Under it!',
    retry: 'Yellow means duck: slide just before the bar.',
  },
  {
    title: 'Purple: duck only',
    mouse: 'Purple blocks are too tall to jump. Only a slide gets under (S or ↓).',
    touch: 'Purple blocks are too tall to jump. Only a slide gets under (swipe down).',
    goal: 'clear',
    road: [{ kind: 'barrier', s: 45, barrier: 'duckStrict', lanes: 0b111 }],
    done: 'Perfect. You know every colour.',
    retry: 'Purple can’t be jumped: slide under it.',
  },
  {
    title: 'Slam',
    mouse: 'Jump the hurdle, then press S or ↓ in the air: you slam down straight into a slide.',
    touch: 'Swipe up over the hurdle, then swipe down in the air: you slam into a slide.',
    goal: 'clear',
    road: [
      { kind: 'barrier', s: 45, barrier: 'jumpFull', lanes: 0b111 },
      { kind: 'barrier', s: 54, barrier: 'duckFull', lanes: 0b111 },
    ],
    done: 'Slam master!',
    retry: 'Jump, then duck while you’re still in the air to drop fast.',
  },
  {
    title: 'Coins and orbs',
    mouse:
      'Coins are your life and your speed. Orbs are a gamble: green helps, red hurts. Grab the green orb on the right.',
    touch:
      'Coins are your life and your speed. Orbs are a gamble: green helps, red hurts. Grab the green orb on the right.',
    goal: 'pickup',
    road: [
      { kind: 'coin', s: 30, lane: 2, y: 0.5 },
      { kind: 'coin', s: 33, lane: 2, y: 0.5 },
      { kind: 'coin', s: 36, lane: 2, y: 0.5 },
      { kind: 'pickup', s: 48, lane: 2, y: 1, pickup: 'speed' },
      { kind: 'pickup', s: 48, lane: 0, y: 1, pickup: 'slow' },
    ],
    done: 'Speed boost! You’re ready to race.',
    retry: 'Get into the right lane and run through the green orb.',
  },
];
