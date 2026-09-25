import type { ComponentType } from 'react';

import type { Phase } from './gameMachine.ts';

type Vec3 = readonly [number, number, number];

/**
 * How a game wants to be framed. Attract orbits `target` at `distance`/`height` (scaled out by
 * ATTRACT_ZOOM); play is a fixed pose the director dollies into.
 */
export type CameraRig = {
  fov: number;
  /**
   * `lensShift` slides the image sideways (camera.filmOffset, mm) so the attract subject can sit
   * beside the menu without breaking the orbit around it; play always frames dead centre.
   */
  attract: { target: Vec3; distance: number; height: number; lensShift?: number };
  play: { position: Vec3; target: Vec3 };
};

export type GameSceneProps = { phase: Phase; generation: number };

/** The lazily loaded half of a registry entry: everything that pulls three.js or game code. */
export type GameModule = {
  Scene: ComponentType<GameSceneProps>;
  rig: CameraRig;
  /** Textures and data the scene reads synchronously; awaited before the scrim lifts. */
  preload?: () => Promise<unknown>;
};
