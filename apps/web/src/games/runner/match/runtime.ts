import type { RunnerDriver } from './driver.ts';

/** The live driver, shared with the camera and the DOM HUD (both outside the scene tree). */
let driver: RunnerDriver | null = null;
export const setDriver = (d: RunnerDriver | null) => {
  driver = d;
};
export const getDriver = () => driver;

/**
 * Where the focus runner is drawn this frame (its gliding lane x, its height, and how fast it is
 * going), written by the scene and read by the camera, which runs in the same frame.
 */
export const focusView = { x: 0, y: 0, speed: 0, shakeX: 0, shakeY: 0 };
