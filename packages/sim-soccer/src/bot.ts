import { BALL_GRAVITY, GOAL_MOUTH_X, HALF_WIDTH, JUMP_SPEED } from './constants.ts';
import {
  ballRadius,
  type Input,
  nextRandom,
  type Player,
  playerRadius,
  type World,
} from './world.ts';

/** How far ahead (s) a bot reads the ball's flight, by skill: sharp bots see further. */
const LOOKAHEAD_MIN_S = 0.12;
const LOOKAHEAD_MAX_S = 0.45;
/** A bot re-decides every N ticks: slower thinkers lag the play (60 Hz ticks). */
const THINK_EVERY_MIN = 3;
const THINK_EVERY_MAX = 14;
/** Aim slop (px) when lining up behind the ball, by skill. */
const SLOP_MAX = 70;
/** Headers: jump when the falling ball will pass this high above the head within reach. */
const HEADER_REACH_X = 110;
const HEADER_WINDOW_Y = 190;

/** Where the ball will be after `t` seconds, ignoring bounces (good enough to read a cross). */
function predict(w: World, t: number) {
  const b = w.ball;
  return {
    x: b.x + b.vx * t,
    y: Math.max(ballRadius(w), b.y + b.vy * t + 0.5 * BALL_GRAVITY * t * t),
  };
}

/**
 * Head-soccer bot: gets behind the ball relative to the goal it attacks, drives it forward, jumps
 * for headers when the ball drops into range, and falls back to guard its goal when the ball is
 * heading home. Deterministic: its only randomness is the sim's PRNG.
 */
export function thinkBot(w: World, i: number): Input {
  const p = w.players[i] as Player;
  const skill = Math.min(1, Math.max(0, p.bot / 100));
  // The bot's working memory lives on the player, so snapshots and replays carry it.
  const brain = p.brain;
  if (w.tick < brain.next) return { h: brain.h, jump: brain.jump };
  const every = Math.round(THINK_EVERY_MAX - (THINK_EVERY_MAX - THINK_EVERY_MIN) * skill);
  brain.next = w.tick + every;
  brain.slop = (nextRandom(w) * 2 - 1) * SLOP_MAX * (1 - skill);

  const dir = p.team === 0 ? 1 : -1;
  const ownGoalX = -dir * HALF_WIDTH;
  const look = LOOKAHEAD_MIN_S + (LOOKAHEAD_MAX_S - LOOKAHEAD_MIN_S) * skill;
  const ball = predict(w, look);
  const r = playerRadius(p);

  // Where to stand: just behind the ball on the attacking line, with skill-scaled slop.
  let targetX = ball.x - dir * (r + ballRadius(w) * 0.6) + brain.slop;
  const ballHome = (w.ball.x - p.x) * dir < -8; // ball is between me and my goal
  const threat = w.ball.vx * dir < -200 && Math.abs(w.ball.x - ownGoalX) < HALF_WIDTH * 0.9;
  if (ballHome || threat) {
    // Get goal-side: run to a spot between the ball and home, a little deeper than the ball.
    targetX = w.ball.x - dir * (r * 1.6);
    const guard = ownGoalX + dir * (GOAL_MOUTH_X * 0.15 + r);
    if ((targetX - guard) * dir < 0) targetX = guard;
  }
  // Pairs split the work: the second bot keeps goal while the ball is in our half, and pushes up
  // behind the play (ready for rebounds) once it's in theirs.
  const mates = w.players.filter((q) => q.team === p.team);
  if (mates.length > 1 && mates.indexOf(p) === 1) {
    const ourHalf = w.ball.x * dir < 0;
    targetX = ourHalf
      ? ownGoalX + dir * (HALF_WIDTH - GOAL_MOUTH_X + r * 0.8)
      : w.ball.x - dir * (r * 4);
  }
  const dx = targetX - p.x;
  brain.h = Math.abs(dx) < 10 ? 0 : dx > 0 ? 1 : -1;

  // Headers and volleys: the ball dropping into range above me.
  const near = Math.abs(w.ball.x - p.x) < HEADER_REACH_X;
  const above = w.ball.y - p.y;
  const falling = w.ball.vy < 120;
  const reachable =
    above > r * 0.6 &&
    above < HEADER_WINDOW_Y + ((JUMP_SPEED * JUMP_SPEED) / (-2 * BALL_GRAVITY)) * 0.35;
  brain.jump = near && falling && reachable && nextRandom(w) < 0.55 + 0.45 * skill;
  // Keep jumping while rising toward a high ball (hold for height).
  if (!p.onGround && p.vy > 0 && w.ball.y > p.y) brain.jump = true;
  return { h: brain.h, jump: brain.jump };
}
