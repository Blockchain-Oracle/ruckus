/**
 * Head-soccer rules and numbers, measured from Eggy League.
 * Units are the game's pixels and seconds; y points up, the floor is y = 0, x = 0 is the centre.
 */

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

// Arena.
export const HALF_WIDTH = 620;
export const CEILING = 864;
/** Goal mouth height (the crossbar's underside) and the crossbar's thickness. */
export const GOAL_HEIGHT = 165;
export const CROSSBAR_THICKNESS = 30;
/** Goals are this deep, recessed into each end wall. */
export const GOAL_DEPTH = 85;
/** A goal counts once the ball is under the bar and past half the goal's depth. */
export const GOAL_LINE_X = HALF_WIDTH - GOAL_DEPTH / 2;
/** The goal mouth opens where the pitch meets the goal (the crossbar's front edge). */
export const GOAL_MOUTH_X = HALF_WIDTH - GOAL_DEPTH;

// Players ("eggs").
export const PLAYER_RADIUS = 43.75;
export const RUN_SPEED = 250;
export const JUMP_SPEED = 750;
/** Hold jump to rise under light gravity; let go while rising and heavy gravity cuts it short. */
export const GRAVITY_HELD = -1200;
export const GRAVITY_RELEASED = -2000;
export const MAX_FALL_SPEED = -750;

// Ball.
export const BALL_RADIUS = 21.875;
export const BALL_GRAVITY = GRAVITY_HELD;
export const BALL_RESTITUTION = 0.9;
export const MAX_BALL_AXIS_SPEED = 1000;

// Kicks (body contact).
/** The ball leaves along the contact normal at this share of its closing speed… */
export const KICK_REFLECT = 0.9;
/** …plus a constant pop up and along its travel, so every touch has life. */
export const KICK_POP_UP = 150;
export const KICK_POP_ALONG = 20;
/** Running into the ball within this of the normal (cos 45°) adds this share of the run. */
export const KICK_DRIVE_COS = Math.SQRT1_2;
export const KICK_DRIVE_SHARE = 0.75;
/** Ground assist: a ball on the floor that you face is lifted at ≥ 45°. */
export const GROUND_ASSIST_COS = Math.SQRT1_2;
/** "On the ground" for the ball (a hair above its resting height). */
export const BALL_GROUND_EPS = 2;

// Match flow (seconds).
export const MATCH_SECONDS = 90;
export const KICKOFF_FREEZE_S = 3;
export const GOAL_PAUSE_S = 2;
/** The ball drops from here at kickoff; players line up at ±300 (1v1) or ±200/±420 (2v2). */
export const KICKOFF_BALL_Y = 300;
export const SPAWN_X_1V1 = [300] as const;
export const SPAWN_X_2V2 = [200, 420] as const;

// Power-ups (bubbles spawn mid-pitch; the last player to touch the ball collects on contact).
export const POWERUP_EVERY_S = 9;
export const POWERUP_RADIUS = 34;
export const POWERUP_LIFETIME_S = 8;
export const POWERUP_DURATION_S = 6;
export const POWERUP_SPAWN_BAND = { x: 360, yMin: 140, yMax: 460 } as const;
/** Effect sizes. */
export const SPEED_BOOST = 1.45;
export const GROW_PLAYER = 1.35;
export const SHRINK_PLAYER = 0.7;
export const GROW_BALL = 1.7;
export const SHRINK_BALL = 0.6;
export const BOUNCY_RESTITUTION = 1.05;
export const FROZEN_S = 2.5;

export const MAX_PLAYERS = 4;
