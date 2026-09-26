import type { PowerUpKind } from '@arena/sim-soccer';

/** Where a lesson puts things (sim px). `target` is a glowing ring to reach with your egg. */
export type Stage = {
  you: { x: number };
  ball: { x: number; y: number; vx?: number; vy?: number };
  target?: { x: number; y: number };
  bubble?: { kind: PowerUpKind; x: number; y: number };
};

export type LessonGoal = 'reach' | 'goal' | 'header' | 'powerup';

export type Lesson = {
  title: string;
  mouse: string;
  touch: string;
  goal: LessonGoal;
  stage: Stage;
  done: string;
  /** Said when the lesson resets itself after a miss. */
  retry?: string;
};

/**
 * Five hands-on lessons, each checked against the live sim: move, the variable jump, kicking on
 * the run, headers, and power-ups (the last-touch rule).
 */
export const LESSONS: readonly Lesson[] = [
  {
    title: 'Move',
    mouse: 'Run right with D or → and stand in the glowing ring.',
    touch: 'Slide the stick right and stand in the glowing ring.',
    goal: 'reach',
    stage: { you: { x: -380 }, ball: { x: -560, y: 22 }, target: { x: 260, y: 44 } },
    done: 'Nice moves!',
  },
  {
    title: 'Jump high',
    mouse: 'Tap W, ↑ or Space for a hop. HOLD it to jump higher: touch the ring up high.',
    touch: 'Tap JUMP for a hop. HOLD it to jump higher: touch the ring up high.',
    goal: 'reach',
    stage: { you: { x: -260 }, ball: { x: -560, y: 22 }, target: { x: -40, y: 290 } },
    done: 'Big air!',
  },
  {
    title: 'Shoot',
    mouse: 'No kick button: run into the ball and it flies. Put it in the goal on the right.',
    touch: 'No kick button: run into the ball and it flies. Put it in the goal on the right.',
    goal: 'goal',
    stage: { you: { x: 60 }, ball: { x: 300, y: 22 } },
    done: 'GOAL! Running into it harder hits it harder.',
    retry: 'Go again: run straight through the ball toward the right goal.',
  },
  {
    title: 'Header',
    mouse: 'The ball is dropping. Get under it and jump: the top of your egg heads it.',
    touch: 'The ball is dropping. Get under it and tap JUMP to head it.',
    goal: 'header',
    stage: { you: { x: -120 }, ball: { x: 120, y: 720, vx: -90, vy: 0 } },
    done: 'Great header!',
    retry: 'Missed it. Watch the ball, get under it, then jump.',
  },
  {
    title: 'Power-ups',
    mouse:
      'Knock the ball through the bubble. The last egg to touch the ball gets it: green helps you, yellow changes the ball, red hits the other team.',
    touch:
      'Knock the ball through the bubble. The last egg to touch the ball gets it: green helps you, yellow changes the ball, red hits the other team.',
    goal: 'powerup',
    stage: {
      you: { x: -320 },
      ball: { x: -120, y: 22 },
      // On the line a run-through dribble takes (traced in the sim), so a first try can land it.
      bubble: { kind: 'speed', x: 150, y: 75 },
    },
    done: 'Speed boost! You know it all. Time for a real match.',
    retry: 'Try again: run into the ball so it flies through the bubble.',
  },
];
