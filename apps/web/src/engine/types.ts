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
  /**
   * Optional live framing during play: where to look (world units) and a zoom (1 = the play pose's
   * distance). Return null to hold the static play pose. `aspect` lets games clamp to their bounds.
   */
  follow?: (aspect: number) => { x: number; y: number; zoom: number } | null;
  /**
   * Optional full camera control during play (an orbiting aim camera, a replay cut): where the
   * camera sits and what it looks at, already smoothed by the game. Wins over `follow`; the entry
   * dolly still blends into it. Return null to fall back to `play`/`follow`.
   */
  pose?: (aspect: number) => { position: Vec3; target: Vec3 } | null;
};

export type GameSceneProps = { phase: Phase; generation: number };

/** The lazily loaded half of a registry entry: everything that pulls three.js or game code. */
export type GameModule = {
  Scene: ComponentType<GameSceneProps>;
  rig: CameraRig;
  /** Textures and data the scene reads synchronously; awaited before the scrim lifts. */
  preload?: () => Promise<unknown>;
  /** Extra hub buttons next to Play (e.g. a wager entry point). */
  HubActions?: ComponentType;
  /** The game's own section in the hub settings sheet (controls, camera, character). */
  Settings?: ComponentType;
  /** Always-mounted DOM layer while this game is selected: sheets, HUDs, result cards. */
  Overlay?: ComponentType;
};
