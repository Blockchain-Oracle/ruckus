import {
  BALL_GRAVITY,
  BALL_GROUND_EPS,
  BALL_RESTITUTION,
  BOUNCY_RESTITUTION,
  CEILING,
  CROSSBAR_THICKNESS,
  DT,
  FROZEN_S,
  GOAL_HEIGHT,
  GOAL_LINE_X,
  GOAL_MOUTH_X,
  GOAL_PAUSE_S,
  GRAVITY_HELD,
  GRAVITY_RELEASED,
  GROUND_ASSIST_COS,
  HALF_WIDTH,
  JUMP_SPEED,
  KICK_DRIVE_COS,
  KICK_DRIVE_SHARE,
  KICK_POP_ALONG,
  KICK_POP_UP,
  KICK_REFLECT,
  MAX_BALL_AXIS_SPEED,
  MAX_FALL_SPEED,
  POWERUP_DURATION_S,
  POWERUP_EVERY_S,
  POWERUP_LIFETIME_S,
  POWERUP_RADIUS,
  POWERUP_SPAWN_BAND,
  RUN_SPEED,
  SPEED_BOOST,
  TICK_HZ,
} from './constants.ts';
import {
  ballRadius,
  kickoff,
  nextRandom,
  type Player,
  POWERUP_TARGET,
  POWERUPS,
  playerRadius,
  type World,
} from './world.ts';

const CROSSBAR_TOP = GOAL_HEIGHT + CROSSBAR_THICKNESS;
const clampAxis = (v: number) =>
  v > MAX_BALL_AXIS_SPEED
    ? MAX_BALL_AXIS_SPEED
    : v < -MAX_BALL_AXIS_SPEED
      ? -MAX_BALL_AXIS_SPEED
      : v;

/** One 60 Hz tick. Inputs are already on the players (humans set them; bots think first). */
export function step(w: World) {
  w.events.length = 0;
  w.tick += 1;
  const frozen = w.phase === 'kickoff' || w.phase === 'over';
  if (w.phase === 'kickoff' || w.phase === 'goal') {
    w.phaseTicks -= 1;
    if (w.phaseTicks <= 0) {
      if (w.phase === 'goal') {
        if (w.clock <= 0) return fullTime(w);
        kickoff(w);
      } else {
        w.phase = 'play';
      }
    }
  }
  if (w.phase === 'over') return;

  for (let i = 0; i < w.players.length; i++) movePlayer(w, i, frozen);
  separatePlayers(w);
  if (!frozen) {
    moveBall(w);
    for (let i = 0; i < w.players.length; i++) touchBall(w, i);
    containBall(w);
    powerUps(w);
    checkGoal(w);
    effectsTick(w);
  }
  if (w.phase === 'play') {
    w.clock -= 1;
    if (w.clock <= 0) fullTime(w);
  }
}

function fullTime(w: World) {
  w.phase = 'over';
  w.events.push({ kind: 'whistle', what: 'fulltime' });
}

function movePlayer(w: World, i: number, frozen: boolean) {
  const p = w.players[i] as Player;
  const r = playerRadius(p);
  const stuck = frozen || p.frozen > 0;
  const h = stuck ? 0 : p.input.h;
  p.vx = h * RUN_SPEED * (p.speed > 0 ? SPEED_BOOST : 1);
  if (h !== 0) p.facing = h;
  if (!stuck && p.input.jump && p.onGround) {
    p.vy = JUMP_SPEED;
    p.onGround = false;
    w.events.push({ kind: 'jump', player: i });
  }
  // Variable jump: light gravity while jump is held (or falling), heavy once released on the way up.
  const g = p.vy > 0 && !p.input.jump ? GRAVITY_RELEASED : GRAVITY_HELD;
  p.vy += g * DT;
  if (p.vy < MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;
  p.x += p.vx * DT;
  p.y += p.vy * DT;
  // Floor, ceiling, end walls.
  if (p.y <= r) {
    p.y = r;
    p.vy = 0;
    p.onGround = true;
  } else {
    p.onGround = false;
  }
  if (p.y > CEILING - r) {
    p.y = CEILING - r;
    if (p.vy > 0) p.vy = 0;
  }
  const maxX = HALF_WIDTH - r;
  if (p.x > maxX) p.x = maxX;
  if (p.x < -maxX) p.x = -maxX;
  // Crossbars: a player can stand in the goal mouth but not pass through the bar.
  crossbarPush(p, r);
}

/** Push a circle out of either crossbar (a solid box above each goal mouth). Returns the normal hit. */
function crossbarPush(o: { x: number; y: number; vx: number; vy: number }, r: number) {
  const side = o.x > 0 ? 1 : -1;
  const ax = o.x * side;
  // Nearest point on the bar box [GOAL_MOUTH_X, HALF_WIDTH] × [GOAL_HEIGHT, CROSSBAR_TOP].
  const nx = ax < GOAL_MOUTH_X ? GOAL_MOUTH_X : ax > HALF_WIDTH ? HALF_WIDTH : ax;
  const ny = o.y < GOAL_HEIGHT ? GOAL_HEIGHT : o.y > CROSSBAR_TOP ? CROSSBAR_TOP : o.y;
  const dx = ax - nx;
  const dy = o.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2);
  let ux: number;
  let uy: number;
  if (d > 1e-9) {
    ux = dx / d;
    uy = dy / d;
  } else {
    // Centre inside the bar: leave by the nearer face.
    const toTop = CROSSBAR_TOP - o.y;
    const toBottom = o.y - GOAL_HEIGHT;
    ux = 0;
    uy = toTop < toBottom ? 1 : -1;
  }
  const push = r - d;
  o.x += ux * push * side;
  o.y += uy * push;
  return { x: ux * side, y: uy };
}

function separatePlayers(w: World) {
  const ps = w.players;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i] as Player;
      const b = ps[j] as Player;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = playerRadius(a) + playerRadius(b);
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const ux = dx / d;
      const uy = dy / d;
      a.x -= ux * push;
      b.x += ux * push;
      // Landing on a head: stand on it (the lower one keeps the floor).
      if (uy > 0) {
        b.y += uy * push * 2;
        if (b.vy < 0) {
          b.vy = 0;
          b.onGround = true;
        }
      } else if (uy < 0) {
        a.y -= uy * push * 2;
        if (a.vy < 0) {
          a.vy = 0;
          a.onGround = true;
        }
      }
    }
  }
}

function moveBall(w: World) {
  const b = w.ball;
  const r = ballRadius(w);
  const e = w.ballBouncy > 0 ? BOUNCY_RESTITUTION : BALL_RESTITUTION;
  b.vy += BALL_GRAVITY * DT;
  b.vx = clampAxis(b.vx);
  b.vy = clampAxis(b.vy);
  b.x += b.vx * DT;
  b.y += b.vy * DT;
  const bounce = (speed: number) => {
    if (speed > 60) w.events.push({ kind: 'bounce', speed });
  };
  if (b.y < r) {
    b.y = r;
    if (b.vy < 0) {
      bounce(-b.vy);
      b.vy = -b.vy * e;
      // Rolling friction on the floor: a resting ball comes to rest instead of skating forever.
      if (b.vy < 40) b.vy = 0;
      b.vx *= 0.995;
    }
  }
  if (b.y > CEILING - r) {
    b.y = CEILING - r;
    if (b.vy > 0) {
      bounce(b.vy);
      b.vy = -b.vy * e;
    }
  }
  if (b.x > HALF_WIDTH - r) {
    b.x = HALF_WIDTH - r;
    if (b.vx > 0) {
      bounce(b.vx);
      b.vx = -b.vx * e;
    }
  }
  if (b.x < -(HALF_WIDTH - r)) {
    b.x = -(HALF_WIDTH - r);
    if (b.vx < 0) {
      bounce(-b.vx);
      b.vx = -b.vx * e;
    }
  }
  const n = crossbarPush(b, r);
  if (n) {
    const vn = b.vx * n.x + b.vy * n.y;
    if (vn < 0) {
      w.events.push({ kind: 'post', speed: -vn });
      b.vx -= (1 + e) * vn * n.x;
      b.vy -= (1 + e) * vn * n.y;
    }
  }
}

/** Squeezed between bodies (or a body and a wall), a ball pops up and out instead of jamming. */
const SQUEEZE_POP = 320;

/** A body can press the ball into the floor or a wall: squeeze it back into the arena. */
function containBall(w: World) {
  const b = w.ball;
  const r = ballRadius(w);
  // Still inside someone after every touch was resolved: it's sandwiched. Lift it clear.
  for (const p of w.players) {
    const rp = playerRadius(p);
    const dx = b.x - p.x;
    const min = rp + r;
    if (dx * dx + (b.y - p.y) ** 2 >= min * min) continue;
    const clearY = p.y + Math.sqrt(Math.max(0, min * min - dx * dx)) + 0.5;
    if (clearY > b.y) b.y = clearY;
    if (b.vy < SQUEEZE_POP) b.vy = SQUEEZE_POP;
  }
  if (b.y < r) {
    b.y = r;
    if (b.vy < 0) b.vy = 0;
  }
  if (b.y > CEILING - r) b.y = CEILING - r;
  if (b.x > HALF_WIDTH - r) b.x = HALF_WIDTH - r;
  if (b.x < -(HALF_WIDTH - r)) b.x = -(HALF_WIDTH - r);
  crossbarPush(b, r);
}

/** Body-contact kick (Eggy League): reflect along the normal, pop up, drive with the run. */
function touchBall(w: World, i: number) {
  const p = w.players[i] as Player;
  const b = w.ball;
  const rp = playerRadius(p);
  const rb = ballRadius(w);
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const min = rp + rb;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return;
  const d = Math.sqrt(d2) || 1e-9;
  let nx = dx / d;
  let ny = dy / d;
  // Out of the body first.
  b.x = p.x + nx * min;
  b.y = p.y + ny * min;
  const closing = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
  if (closing >= 0 && w.lastTouch === i) return;
  // Ground assist: running into a ball on the floor that you face lifts it at ≥ 45°.
  const onGround = b.y <= rb + BALL_GROUND_EPS;
  if (onGround && Math.sign(dx) === p.facing && ny < GROUND_ASSIST_COS) {
    nx = Math.sign(nx || p.facing) * GROUND_ASSIST_COS;
    ny = GROUND_ASSIST_COS;
  }
  const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
  let vx = nx * speed * KICK_REFLECT + Math.sign(nx || p.facing) * KICK_POP_ALONG;
  let vy = ny * speed * KICK_REFLECT + KICK_POP_UP;
  const ps = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (ps > 0 && (p.vx * nx + p.vy * ny) / ps >= KICK_DRIVE_COS) {
    vx += p.vx * KICK_DRIVE_SHARE;
    vy += p.vy * KICK_DRIVE_SHARE;
  }
  b.vx = clampAxis(vx);
  b.vy = clampAxis(vy);
  if (w.lastTouch !== i || closing < 0)
    w.events.push({ kind: 'kick', player: i, speed: Math.sqrt(b.vx * b.vx + b.vy * b.vy) });
  w.lastTouch = i;
}

function powerUps(w: World) {
  w.spawnTicks -= 1;
  if (!w.powerUp && w.spawnTicks <= 0) {
    const band = POWERUP_SPAWN_BAND;
    const kind = POWERUPS[Math.floor(nextRandom(w) * POWERUPS.length)] ?? 'speed';
    w.powerUp = {
      kind,
      x: (nextRandom(w) * 2 - 1) * band.x,
      y: band.yMin + nextRandom(w) * (band.yMax - band.yMin),
      life: POWERUP_LIFETIME_S * TICK_HZ,
    };
    w.spawnTicks = POWERUP_EVERY_S * TICK_HZ;
  }
  const pu = w.powerUp;
  if (!pu) return;
  pu.life -= 1;
  if (pu.life <= 0) {
    w.powerUp = null;
    return;
  }
  const dx = w.ball.x - pu.x;
  const dy = w.ball.y - pu.y;
  const reach = ballRadius(w) + POWERUP_RADIUS;
  if (dx * dx + dy * dy > reach * reach || w.lastTouch < 0) return;
  const owner = w.players[w.lastTouch];
  if (!owner) return;
  const ticks = POWERUP_DURATION_S * TICK_HZ;
  const target = POWERUP_TARGET[pu.kind];
  if (target === 'ball') {
    if (pu.kind === 'bouncy') w.ballBouncy = ticks;
    if (pu.kind === 'growBall') {
      w.ballGrow = ticks;
      w.ballShrink = 0;
    }
    if (pu.kind === 'shrinkBall') {
      w.ballShrink = ticks;
      w.ballGrow = 0;
    }
  } else {
    const hit = target === 'self' ? [owner] : w.players.filter((p) => p.team !== owner.team);
    for (const p of hit) {
      if (pu.kind === 'speed') p.speed = ticks;
      if (pu.kind === 'growPlayer') {
        p.grow = ticks;
        p.shrink = 0;
      }
      if (pu.kind === 'shrinkPlayer') {
        p.shrink = ticks;
        p.grow = 0;
      }
      if (pu.kind === 'freeze') p.frozen = FROZEN_S * TICK_HZ;
    }
  }
  w.events.push({ kind: 'powerup', power: pu.kind, player: w.lastTouch });
  w.powerUp = null;
}

function effectsTick(w: World) {
  for (const p of w.players) {
    if (p.speed > 0) p.speed -= 1;
    if (p.grow > 0) p.grow -= 1;
    if (p.shrink > 0) p.shrink -= 1;
    if (p.frozen > 0) p.frozen -= 1;
  }
  if (w.ballGrow > 0) w.ballGrow -= 1;
  if (w.ballShrink > 0) w.ballShrink -= 1;
  if (w.ballBouncy > 0) w.ballBouncy -= 1;
}

function checkGoal(w: World) {
  if (w.phase !== 'play') return;
  const b = w.ball;
  if (b.y > GOAL_HEIGHT) return;
  // Ball in the right goal scores for team 0 (who attacks right), and vice versa.
  const team: 0 | 1 | null = b.x > GOAL_LINE_X ? 0 : b.x < -GOAL_LINE_X ? 1 : null;
  if (team === null) return;
  w.score[team] += 1;
  w.phase = 'goal';
  w.phaseTicks = GOAL_PAUSE_S * TICK_HZ;
  w.events.push({ kind: 'goal', team });
}
