import {
  BALL_RADIUS,
  KICKOFF_BALL_Y,
  KICKOFF_FREEZE_S,
  MATCH_SECONDS,
  PLAYER_RADIUS,
  POWERUP_EVERY_S,
  SPAWN_X_1V1,
  SPAWN_X_2V2,
  TICK_HZ,
} from './constants.ts';

export const POWERUPS = [
  'speed',
  'growPlayer',
  'bouncy',
  'growBall',
  'shrinkBall',
  'freeze',
  'shrinkPlayer',
] as const;
export type PowerUpKind = (typeof POWERUPS)[number];
/** Who a pitch power-up lands on, relative to the last player to touch the ball. */
export const POWERUP_TARGET = {
  speed: 'self',
  growPlayer: 'self',
  bouncy: 'ball',
  growBall: 'ball',
  shrinkBall: 'ball',
  freeze: 'opponent',
  shrinkPlayer: 'opponent',
} as const satisfies Record<PowerUpKind, 'self' | 'ball' | 'opponent'>;

export type Input = { h: -1 | 0 | 1; jump: boolean };

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 attacks the right goal (x > 0); 1 attacks the left. */
  team: 0 | 1;
  facing: 1 | -1;
  onGround: boolean;
  input: Input;
  /** Ticks left on each effect (0 = off). */
  speed: number;
  grow: number;
  shrink: number;
  frozen: number;
  /** Bot difficulty 0–100, or −1 for a human (or remote) seat. */
  bot: number;
  /** A bot's last decision and when it next re-thinks (part of the state, for replays). */
  brain: { next: number; h: -1 | 0 | 1; jump: boolean; slop: number };
};

export type Phase = 'kickoff' | 'play' | 'goal' | 'over';

export type SimEvent =
  | { kind: 'kick'; player: number; speed: number }
  | { kind: 'bounce'; speed: number }
  | { kind: 'post'; speed: number }
  | { kind: 'goal'; team: 0 | 1 }
  | { kind: 'jump'; player: number }
  | { kind: 'powerup'; power: PowerUpKind; player: number }
  | { kind: 'whistle'; what: 'kickoff' | 'fulltime' };

export type World = {
  tick: number;
  phase: Phase;
  /** Ticks left in the current kickoff/goal pause. */
  phaseTicks: number;
  /** Match clock, in ticks of play remaining. */
  clock: number;
  score: [number, number];
  ball: { x: number; y: number; vx: number; vy: number };
  lastTouch: number;
  /** Ball effects (ticks left). */
  ballGrow: number;
  ballShrink: number;
  ballBouncy: number;
  powerUp: { kind: PowerUpKind; x: number; y: number; life: number } | null;
  spawnTicks: number;
  players: Player[];
  /** PRNG state (mulberry32), advanced only by the sim. */
  rng: number;
  events: SimEvent[];
};

export function nextRandom(w: World): number {
  w.rng = (w.rng + 0x6d2b79f5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export type Team = 0 | 1;
/**
 * Who plays: 1 or 2 per side, alternating Tomato, Violet (1v1, 2v2), or one team per player for
 * any line-up up to 2 a side (2v1, 1v2). The numeric forms build exactly the lists they always did.
 */
export type Layout = 1 | 2 | readonly Team[];
export const MAX_PER_TEAM = 2;

export const layoutTeams = (layout: Layout): Team[] =>
  typeof layout === 'number'
    ? Array.from({ length: layout * 2 }, (_, i) => (i % 2) as Team)
    : [...layout];

/** A line-up the sim can play: at least one a side, at most two. */
export function validLayout(teams: readonly Team[]) {
  const count = (t: Team) => teams.filter((x) => x === t).length;
  return [0, 1].every((t) => count(t as Team) >= 1 && count(t as Team) <= MAX_PER_TEAM);
}

/** A new match: `layout` says who plays for whom; `bots[i]` is each seat's difficulty or −1. */
export function newWorld(seed: number, layout: Layout, bots: readonly number[]): World {
  const players: Player[] = [];
  for (const team of layoutTeams(layout)) {
    players.push({
      x: 0,
      y: PLAYER_RADIUS,
      vx: 0,
      vy: 0,
      team,
      facing: team === 0 ? 1 : -1,
      onGround: true,
      input: { h: 0, jump: false },
      speed: 0,
      grow: 0,
      shrink: 0,
      frozen: 0,
      bot: bots[players.length] ?? -1,
      brain: { next: 0, h: 0, jump: false, slop: 0 },
    });
  }
  const w: World = {
    tick: 0,
    phase: 'kickoff',
    phaseTicks: 0,
    clock: MATCH_SECONDS * TICK_HZ,
    score: [0, 0],
    ball: { x: 0, y: KICKOFF_BALL_Y, vx: 0, vy: 0 },
    lastTouch: -1,
    ballGrow: 0,
    ballShrink: 0,
    ballBouncy: 0,
    powerUp: null,
    spawnTicks: POWERUP_EVERY_S * TICK_HZ,
    players,
    rng: seed >>> 0 || 1,
    events: [],
  };
  kickoff(w);
  return w;
}

/** Line everyone up, drop the ball from the centre, and freeze for the countdown. */
export function kickoff(w: World) {
  const size = [0, 0];
  for (const p of w.players) size[p.team] = (size[p.team] ?? 0) + 1;
  const seen = [0, 0];
  w.players.forEach((p) => {
    // Each side lines up by its own size, so a lone player in a 2v1 stands where a 1v1 player would.
    const spots = size[p.team] === 1 ? SPAWN_X_1V1 : SPAWN_X_2V2;
    const slot = seen[p.team] ?? 0;
    seen[p.team] = slot + 1;
    const side = p.team === 0 ? -1 : 1;
    p.x = side * (spots[slot] ?? spots[0]);
    p.y = PLAYER_RADIUS;
    p.vx = 0;
    p.vy = 0;
    p.facing = p.team === 0 ? 1 : -1;
    p.onGround = true;
    p.frozen = 0;
  });
  w.ball = { x: 0, y: KICKOFF_BALL_Y, vx: 0, vy: 0 };
  w.lastTouch = -1;
  w.phase = 'kickoff';
  w.phaseTicks = KICKOFF_FREEZE_S * TICK_HZ;
  w.events.push({ kind: 'whistle', what: 'kickoff' });
}

export const ballRadius = (w: World) =>
  BALL_RADIUS * (w.ballGrow > 0 ? 1.7 : 1) * (w.ballShrink > 0 ? 0.6 : 1);
export const playerRadius = (p: Player) =>
  PLAYER_RADIUS * (p.grow > 0 ? 1.35 : 1) * (p.shrink > 0 ? 0.7 : 1);
