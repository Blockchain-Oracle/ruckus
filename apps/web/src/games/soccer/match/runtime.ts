import type { SoccerDriver } from './driver.ts';

/** The live driver, shared with the camera and the DOM HUD (both outside the scene tree). */
let driver: SoccerDriver | null = null;
export const setDriver = (d: SoccerDriver | null) => {
  driver = d;
};
export const getDriver = () => driver;
