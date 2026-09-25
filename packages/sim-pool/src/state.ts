import {
  BALL_COUNT,
  BALL_RADIUS_M,
  CUE_BALL,
  EIGHT_BALL,
  FOOT_SPOT_X,
  HEAD_STRING_X,
  RACK_GAP_M,
  RACK_JITTER_M,
} from './constants.ts';
import { prng } from './math.ts';

/**
 * All balls in one Float64Array (cheap to copy, hash and send). Per ball:
 * x, y (m) · vx, vy (m/s) · wx, wy, wz (rad/s) · pocket (−1 on the table, else pocket id).
 */
export const F = { x: 0, y: 1, vx: 2, vy: 3, wx: 4, wy: 5, wz: 6, pocket: 7 } as const;
export const STRIDE = 8;
export const ON_TABLE = -1;

export type Balls = Float64Array;

export const newBalls = (): Balls => {
  const b = new Float64Array(BALL_COUNT * STRIDE);
  for (let i = 0; i < BALL_COUNT; i++) b[i * STRIDE + F.pocket] = ON_TABLE;
  return b;
};

export const at = (b: Balls, i: number, f: number) => b[i * STRIDE + f] ?? 0;
export const set = (b: Balls, i: number, f: number, v: number) => {
  b[i * STRIDE + f] = v;
};
export const onTable = (b: Balls, i: number) => at(b, i, F.pocket) === ON_TABLE;

/** Rack slots, apex first, row by row (5 rows). WPA 8-ball: 8 in the centre, a solid and a stripe in the back corners. */
const ROWS = 5;
const EIGHT_SLOT = 4;
const BACK_CORNERS = [10, 14] as const;

/**
 * A legal 8-ball rack: the 8 in the middle, one solid and one stripe in the back corners, the rest
 * shuffled by the seed. Each ball gets a sub-millimetre jitter so no two breaks are identical.
 */
export function rack(seed: number): Balls {
  const b = newBalls();
  const rand = prng(seed);
  const solids = [1, 2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  const shuffle = (a: number[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j] as number, a[i] as number];
    }
  };
  shuffle(solids);
  shuffle(stripes);
  const slots: number[] = new Array(15).fill(0);
  slots[EIGHT_SLOT] = EIGHT_BALL;
  const [left, right] = BACK_CORNERS;
  const solidLeft = rand() < 0.5;
  slots[solidLeft ? left : right] = solids.pop() as number;
  slots[solidLeft ? right : left] = stripes.pop() as number;
  const rest = [...solids, ...stripes];
  shuffle(rest);
  for (let s = 0; s < 15; s++) if (slots[s] === 0) slots[s] = rest.pop() as number;

  // Rows advance along +x by √3·R (plus a hair); each row is centred on the long axis.
  const pitch = 2 * BALL_RADIUS_M + RACK_GAP_M + RACK_JITTER_M;
  const rowStep = (pitch * Math.sqrt(3)) / 2;
  const jitter = () => (rand() - 0.5) * RACK_JITTER_M;
  let slot = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let k = 0; k <= row; k++) {
      const ball = slots[slot++] as number;
      set(b, ball, F.x, FOOT_SPOT_X + row * rowStep + jitter());
      set(b, ball, F.y, (k - row / 2) * pitch + jitter());
    }
  }
  set(b, CUE_BALL, F.x, (HEAD_STRING_X * 3) / 2);
  set(b, CUE_BALL, F.y, 0);
  return b;
}

export const isSolid = (i: number) => i >= 1 && i <= 7;
export const isStripe = (i: number) => i >= 9 && i <= 15;
