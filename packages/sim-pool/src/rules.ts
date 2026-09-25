import {
  BALL_RADIUS_M,
  CUE_BALL,
  EIGHT_BALL,
  FOOT_SPOT_X,
  HALF_L,
  HALF_W,
  HEAD_STRING_X,
} from './constants.ts';
import type { ShotEvent } from './engine.ts';
import { at, type Balls, F, isSolid, isStripe, ON_TABLE, onTable, set } from './state.ts';

export type Group = 'solids' | 'stripes';
export type Foul =
  | 'scratch'
  | 'no-hit'
  | 'wrong-ball'
  | 'no-rail'
  | 'eight-early'
  | 'eight-wrong-pocket';

/**
 * 8-ball match state (WPA-style, with online 8-ball conventions: call the pocket for the 8, and
 * potting it early, in the wrong pocket or with a scratch loses the rack).
 */
export type RackState = {
  shooter: 0 | 1;
  groups: [Group | null, Group | null];
  isBreak: boolean;
  /** Ball in hand for the shooter: anywhere, or behind the head string on the break. */
  ballInHand: 'none' | 'anywhere' | 'kitchen';
  winner: -1 | 0 | 1;
};

export type ShotOutcome = {
  foul: Foul | null;
  potted: number[];
  /** Did the shooter keep the table? */
  continues: boolean;
  /** Groups decided on this shot. */
  assigned: boolean;
  winner: -1 | 0 | 1;
  /** Short line for the HUD ("Scratch · ball in hand", "Stripes for you"). */
  message: string;
};

export const newRack = (breaker: 0 | 1 = 0): RackState => ({
  shooter: breaker,
  groups: [null, null],
  isBreak: true,
  ballInHand: 'kitchen',
  winner: -1,
});

const groupOf = (ball: number): Group | null =>
  isSolid(ball) ? 'solids' : isStripe(ball) ? 'stripes' : null;
const other = (g: Group): Group => (g === 'solids' ? 'stripes' : 'solids');

/** Has `group` been cleared from the table (given the balls after the shot's pots)? */
export function groupCleared(b: Balls, group: Group) {
  for (let i = 1; i <= 15; i++) if (groupOf(i) === group && onTable(b, i)) return false;
  return true;
}

/** Which balls may the shooter legally hit first right now? */
export function legalTargets(state: RackState, b: Balls): number[] {
  const g = state.groups[state.shooter];
  const out: number[] = [];
  for (let i = 1; i <= 15; i++) {
    if (!onTable(b, i)) continue;
    if (g === null) {
      if (i !== EIGHT_BALL) out.push(i);
    } else if (groupOf(i) === g) out.push(i);
  }
  if (g !== null && out.length === 0 && onTable(b, EIGHT_BALL)) out.push(EIGHT_BALL);
  return out;
}

/** The shooter is on the 8 (needs to call a pocket). */
export const onEight = (state: RackState, b: Balls) => {
  const g = state.groups[state.shooter];
  return g !== null && groupCleared(b, g);
};

/**
 * Judge a finished shot. `before` is the table as the shot began (to know whether the shooter was
 * already on the 8); `calledPocket` is the pocket named for the 8 (−1 if none).
 */
export function judgeShot(
  state: RackState,
  before: Balls,
  after: Balls,
  events: readonly ShotEvent[],
  calledPocket: number,
): ShotOutcome {
  const shooter = state.shooter;
  const mine = state.groups[shooter];
  const wasOnEight = mine !== null && groupCleared(before, mine);

  let firstHit = -1;
  let railAfterContact = false;
  const potted: number[] = [];
  let eightPocket = -1;
  for (const e of events) {
    if (e.kind === 'ball' && firstHit < 0 && (e.a === CUE_BALL || e.b === CUE_BALL))
      firstHit = e.a === CUE_BALL ? e.b : e.a;
    else if (e.kind === 'cushion' && firstHit >= 0) railAfterContact = true;
    else if (e.kind === 'pocket') {
      potted.push(e.a);
      if (e.a === EIGHT_BALL) eightPocket = e.pocket;
    }
  }
  const objectPots = potted.filter((i) => i !== CUE_BALL && i !== EIGHT_BALL);
  const scratch = potted.includes(CUE_BALL);

  let foul: Foul | null = null;
  if (scratch) foul = 'scratch';
  else if (firstHit < 0) foul = 'no-hit';
  else if (!state.isBreak) {
    const legal =
      mine === null
        ? firstHit !== EIGHT_BALL
        : wasOnEight
          ? firstHit === EIGHT_BALL
          : groupOf(firstHit) === mine;
    if (!legal) foul = 'wrong-ball';
    else if (!railAfterContact && potted.length === 0) foul = 'no-rail';
  }

  // The 8 decides the rack, except on the break where it is spotted back.
  if (eightPocket >= 0) {
    if (state.isBreak) {
      respotEight(after);
    } else {
      const win = wasOnEight && foul === null && eightPocket === calledPocket;
      const winner = (win ? shooter : 1 - shooter) as 0 | 1;
      const why = !wasOnEight
        ? 'The 8 went down early'
        : foul
          ? 'The 8 went down on a foul'
          : eightPocket !== calledPocket
            ? 'The 8 went in the wrong pocket'
            : '';
      return {
        foul: win ? null : !wasOnEight ? 'eight-early' : (foul ?? 'eight-wrong-pocket'),
        potted,
        continues: false,
        assigned: false,
        winner,
        message: win ? 'Called it. Rack over!' : `${why}. Rack lost.`,
      };
    }
  }

  // Groups: the first clean pot after the break decides (the break itself leaves the table open).
  let assigned = false;
  if (mine === null && foul === null && !state.isBreak) {
    const first = objectPots[0];
    const g = first !== undefined ? groupOf(first) : null;
    if (g) {
      state.groups[shooter] = g;
      state.groups[1 - shooter] = other(g);
      assigned = true;
    }
  }
  const nowMine = state.groups[shooter];
  const pottedOwn =
    nowMine === null ? objectPots.length > 0 : objectPots.some((i) => groupOf(i) === nowMine);
  const continues = foul === null && (state.isBreak ? objectPots.length > 0 : pottedOwn);

  let message = '';
  if (foul) message = `${FOUL_TEXT[foul]} · ball in hand`;
  else if (assigned) message = `${nowMine === 'solids' ? 'Solids' : 'Stripes'} for you`;
  else if (continues) message = 'Nice. Shoot again';
  return { foul, potted, continues, assigned, winner: -1, message };
}

export const FOUL_TEXT = {
  scratch: 'Scratch',
  'no-hit': 'No ball hit',
  'wrong-ball': 'Wrong ball first',
  'no-rail': 'No rail after contact',
  'eight-early': 'The 8 went down early',
  'eight-wrong-pocket': 'Wrong pocket',
} as const satisfies Record<Foul, string>;

/** Apply a judged shot to the rack: next shooter, ball in hand, cue ball back if scratched. */
export function applyOutcome(state: RackState, after: Balls, out: ShotOutcome) {
  state.isBreak = false;
  if (out.winner >= 0) {
    state.winner = out.winner;
    return;
  }
  if (!out.continues) state.shooter = (1 - state.shooter) as 0 | 1;
  state.ballInHand = out.foul ? 'anywhere' : 'none';
  if (!onTable(after, CUE_BALL)) {
    set(after, CUE_BALL, F.pocket, ON_TABLE);
    // A spot the shooter will move anyway; kept legal so nothing overlaps meanwhile.
    placeFree(after, CUE_BALL, HEAD_STRING_X * 1.5, 0);
  }
}

const R = BALL_RADIUS_M;

/** Can the cue ball go at (x, y)? Inside the cushions, not touching any ball, kitchen on the break. */
export function canPlaceCue(b: Balls, x: number, y: number, where: 'anywhere' | 'kitchen') {
  if (x < -HALF_L + R || x > HALF_L - R || y < -HALF_W + R || y > HALF_W - R) return false;
  if (where === 'kitchen' && x > HEAD_STRING_X) return false;
  for (let i = 1; i <= 15; i++) {
    if (!onTable(b, i)) continue;
    const dx = at(b, i, F.x) - x;
    const dy = at(b, i, F.y) - y;
    if (dx * dx + dy * dy < 4 * R * R) return false;
  }
  return true;
}

function placeFree(b: Balls, ball: number, x: number, y: number) {
  const step = 2 * R;
  for (let k = 0; k < 40; k++) {
    const px = x - k * step * 0.5;
    if (canPlaceCue(b, px, y, 'anywhere')) {
      set(b, ball, F.x, px);
      set(b, ball, F.y, y);
      return;
    }
  }
}

/** Back on the foot spot, or the nearest free point toward the foot rail. */
function respotEight(b: Balls) {
  set(b, EIGHT_BALL, F.pocket, ON_TABLE);
  for (let f = F.vx; f <= F.wz; f++) set(b, EIGHT_BALL, f, 0);
  for (let k = 0; k < 40; k++) {
    const x = FOOT_SPOT_X + k * R * 0.5;
    let free = x < HALF_L - R;
    for (let i = 0; i < 16 && free; i++) {
      if (i === EIGHT_BALL || !onTable(b, i)) continue;
      const dx = at(b, i, F.x) - x;
      const dy = at(b, i, F.y);
      if (dx * dx + dy * dy < 4 * R * R) free = false;
    }
    if (free) {
      set(b, EIGHT_BALL, F.x, x);
      set(b, EIGHT_BALL, F.y, 0);
      return;
    }
  }
}
