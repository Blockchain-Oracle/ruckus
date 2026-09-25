/** Chickenz's 8 lessons (`tutorial/Tutorial.ts:34-74`), keyboard and touch wording. */
export type Condition =
  | 'movement'
  | 'jump'
  | 'double_jump'
  | 'weapon'
  | 'shoot'
  | 'stomp_escape'
  | 'kill'
  | 'auto';

export const STEPS = [
  { text: 'Press A/D to move', touch: 'Use joystick to move', condition: 'movement' },
  { text: 'Press W to jump', touch: 'Push joystick up to jump', condition: 'jump' },
  {
    text: 'Press W again mid-air to double jump!\nReach the high platform!',
    touch: 'Push joystick up again while airborne!\nReach the high platform!',
    condition: 'double_jump',
  },
  {
    text: 'Walk over a weapon to pick it up',
    touch: 'Walk over a weapon to pick it up',
    condition: 'weapon',
  },
  { text: 'Press SPACE to shoot', touch: 'Tap the red button to shoot', condition: 'shoot' },
  {
    text: "You've been stomped!\nMash LEFT and RIGHT to escape!",
    touch: "You've been stomped!\nSpin the joystick to escape!",
    condition: 'stomp_escape',
  },
  { text: 'Now take them out!', touch: 'Now take them out!', condition: 'kill' },
  { text: "You're ready! Good luck!", touch: "You're ready! Good luck!", condition: 'auto' },
] as const satisfies readonly { text: string; touch: string; condition: Condition }[];

/** Step 1 completes after this many ticks of holding left or right. */
export const MOVE_TICKS_TO_PASS = 30;
export const FINAL_STEP_MS = 3_000;
export const TUTORIAL_DONE_KEY = 'ruckus.chickenz.tutorialDone';
