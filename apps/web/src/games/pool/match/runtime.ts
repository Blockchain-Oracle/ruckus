import type { PoolDirector } from './director.ts';

/** The live director, shared with the camera and the DOM HUD (both outside the scene tree). */
let director: PoolDirector | null = null;
export const setDirector = (d: PoolDirector | null) => {
  director = d;
};
export const getDirector = () => director;
