import type { ChickenzDriver } from '../sim/driver.ts';

/**
 * The live driver, shared with the DOM HUD and the camera (both sit outside the scene tree).
 * The scene registers it on mount and clears it on unmount.
 */
let driver: ChickenzDriver | null = null;

export const setDriver = (d: ChickenzDriver | null) => {
  driver = d;
};
export const getDriver = () => driver;
