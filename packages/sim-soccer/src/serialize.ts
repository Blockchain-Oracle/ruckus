import { type Phase, type Player, POWERUPS, type World } from './world.ts';

/**
 * The whole world as Float64 values: numbers travel bit-exact (including −0), so a client that
 * unpacks a server snapshot continues exactly as the server would. Events are per-tick output and
 * don't travel.
 */
const PHASES = ['kickoff', 'play', 'goal', 'over'] as const satisfies readonly Phase[];
const HEADER = 20;
const PER_PLAYER = 18;

export const packedLength = (players: number) => HEADER + players * PER_PLAYER;

export function packWorld(w: World, out = new Float64Array(packedLength(w.players.length))) {
  const pu = w.powerUp;
  out.set(
    [
      w.tick,
      PHASES.indexOf(w.phase as (typeof PHASES)[number]),
      w.phaseTicks,
      w.clock,
      w.score[0],
      w.score[1],
      w.ball.x,
      w.ball.y,
      w.ball.vx,
      w.ball.vy,
      w.lastTouch,
      w.ballGrow,
      w.ballShrink,
      w.ballBouncy,
      pu ? POWERUPS.indexOf(pu.kind) : -1,
      pu?.x ?? 0,
      pu?.y ?? 0,
      pu?.life ?? 0,
      w.spawnTicks,
      w.rng,
    ],
    0,
  );
  w.players.forEach((p, i) => {
    out.set(
      [
        p.x,
        p.y,
        p.vx,
        p.vy,
        p.team,
        p.facing,
        p.onGround ? 1 : 0,
        p.input.h,
        p.input.jump ? 1 : 0,
        p.speed,
        p.grow,
        p.shrink,
        p.frozen,
        p.bot,
        p.brain.next,
        p.brain.h,
        p.brain.jump ? 1 : 0,
        p.brain.slop,
      ],
      HEADER + i * PER_PLAYER,
    );
  });
  return out;
}

const dir = (v: number) => (v < 0 ? -1 : v > 0 ? 1 : 0) as -1 | 0 | 1;

/** Overwrites `w` in place (its player count must match the packed one). Returns false if not. */
export function unpackWorld(w: World, a: Float64Array): boolean {
  const players = (a.length - HEADER) / PER_PLAYER;
  if (!Number.isInteger(players) || players !== w.players.length) return false;
  const at = (i: number) => a[i] ?? 0;
  w.tick = at(0);
  w.phase = PHASES[at(1)] ?? 'play';
  w.phaseTicks = at(2);
  w.clock = at(3);
  w.score = [at(4), at(5)];
  w.ball = { x: at(6), y: at(7), vx: at(8), vy: at(9) };
  w.lastTouch = at(10);
  w.ballGrow = at(11);
  w.ballShrink = at(12);
  w.ballBouncy = at(13);
  const kind = POWERUPS[at(14)];
  w.powerUp = kind ? { kind, x: at(15), y: at(16), life: at(17) } : null;
  w.spawnTicks = at(18);
  w.rng = at(19) >>> 0;
  w.events.length = 0;
  w.players.forEach((p: Player, i) => {
    const b = HEADER + i * PER_PLAYER;
    p.x = at(b);
    p.y = at(b + 1);
    p.vx = at(b + 2);
    p.vy = at(b + 3);
    p.team = at(b + 4) === 1 ? 1 : 0;
    p.facing = at(b + 5) < 0 ? -1 : 1;
    p.onGround = at(b + 6) === 1;
    p.input = { h: dir(at(b + 7)), jump: at(b + 8) === 1 };
    p.speed = at(b + 9);
    p.grow = at(b + 10);
    p.shrink = at(b + 11);
    p.frozen = at(b + 12);
    p.bot = at(b + 13);
    p.brain = { next: at(b + 14), h: dir(at(b + 15)), jump: at(b + 16) === 1, slop: at(b + 17) };
  });
  return true;
}
