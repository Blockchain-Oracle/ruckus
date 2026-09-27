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
   * `swayRad` swings back and forth through ±that angle instead of orbiting all the way round:
   * flat scenes (a 2D board) have no back worth showing.
   */
  attract: {
    target: Vec3;
    distance: number;
    height: number;
    lensShift?: number;
    swayRad?: number;
  };
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

export type GameModes = {
  /** Play with friends: open the room lobby. */
  friends(): void;
  /** Bet: open the game's VRF round (named by the registry's `wager`). */
  bet(): void;
  /** An extra first action shown above Play (Neon Dash's "Beat NAME" challenge link). */
  Extra?: ComponentType;
  /** Mode options as chips on the game card (team size, bot level). */
  Options?: ComponentType;
};

/** The lazily loaded half of a registry entry: everything that pulls three.js or game code. */
export type GameModule = {
  Scene: ComponentType<GameSceneProps>;
  rig: CameraRig;
  /** Textures and data the scene reads synchronously; awaited before the scrim lifts. */
  preload?: () => Promise<unknown>;
  /**
   * The ADR-010 modes' entry points. Play is the shell's own (the dolly into a local match); the
   * shell renders every button, so all four games say the same thing in the same place.
   */
  modes: GameModes;
  /** The game's own section in the hub settings sheet (controls, camera, character). */
  Settings?: ComponentType;
  /** Always-mounted DOM layer while this game is selected: sheets, HUDs, result cards. */
  Overlay?: ComponentType;
};
