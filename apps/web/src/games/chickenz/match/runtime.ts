import { KeyboardInput } from '../input/keyboard.ts';
import { TouchSticks } from '../input/touch.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import type { TutorialDirector } from '../tutorial/director.ts';
import type { MatchDirector } from './director.ts';

/**
 * The live driver, shared with the DOM HUD and the camera (both sit outside the scene tree).
 * The scene registers it on mount and clears it on unmount.
 */
let driver: ChickenzDriver | null = null;

export const setDriver = (d: ChickenzDriver | null) => {
  driver = d;
};
export const getDriver = () => driver;

/** One input manager per page: keyboard/mouse, with the on-screen sticks ORed in on touch. */
export const input = new KeyboardInput();
export const touch = new TouchSticks();
input.touch = touch;

let directors: { match: MatchDirector; tutorial: TutorialDirector } | null = null;
export const setDirectors = (d: typeof directors) => {
  directors = d;
};
export const getDirectors = () => directors;
