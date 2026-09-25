import {
  CORNER_MOUTH_M,
  CORNER_THROAT_M,
  HALF_L,
  HALF_W,
  JAW_DEPTH_M,
  SIDE_MOUTH_M,
  SIDE_THROAT_M,
} from './constants.ts';

/** A straight cushion face; (nx, ny) is its unit normal toward the side balls arrive from. */
export type Segment = { ax: number; ay: number; bx: number; by: number; nx: number; ny: number };
export type Point = { x: number; y: number };

/** Pocket ids in a fixed order: 0-3 corners (−−, +−, −+, ++), 4-5 sides (y−, y+). */
export const POCKETS: readonly Point[] = [
  { x: -HALF_L, y: -HALF_W },
  { x: HALF_L, y: -HALF_W },
  { x: -HALF_L, y: HALF_W },
  { x: HALF_L, y: HALF_W },
  { x: 0, y: -HALF_W },
  { x: 0, y: HALF_W },
];

const unit = (x: number, y: number) => {
  const l = Math.sqrt(x * x + y * y);
  return { x: x / l, y: y / l };
};

/** How far along each rail a corner jaw point sits from the corner (mouth measured jaw to jaw). */
const CORNER_JAW = CORNER_MOUTH_M / Math.SQRT2;
const SIDE_JAW = SIDE_MOUTH_M / 2;

/** A jaw facing from (ax, ay) to (bx, by) whose normal faces the (tx, ty) side (the channel). */
function jaw(ax: number, ay: number, bx: number, by: number, tx: number, ty: number): Segment {
  const n = unit(-(by - ay), bx - ax);
  const flip = n.x * tx + n.y * ty < 0 ? -1 : 1;
  return { ax, ay, bx, by, nx: n.x * flip, ny: n.y * flip };
}

function build() {
  const segments: Segment[] = [];
  const knuckles: Point[] = [];
  for (const sy of [-1, 1] as const) {
    const y = sy * HALF_W;
    // Long rails, split by the side pocket.
    for (const [x0, x1] of [
      [-HALF_L + CORNER_JAW, -SIDE_JAW],
      [SIDE_JAW, HALF_L - CORNER_JAW],
    ] as const) {
      segments.push({ ax: x0, ay: y, bx: x1, by: y, nx: 0, ny: -sy });
      knuckles.push({ x: x0, y }, { x: x1, y });
    }
    // Side-pocket jaws: from the knuckles outwards, narrowing into the throat.
    const sideNarrow = (SIDE_MOUTH_M - SIDE_THROAT_M) / 2;
    for (const sx of [-1, 1] as const) {
      const ax = sx * SIDE_JAW;
      segments.push(jaw(ax, y, ax - sx * sideNarrow, y + sy * JAW_DEPTH_M, -sx, 0));
    }
  }
  for (const sx of [-1, 1] as const) {
    const x = sx * HALF_L;
    // Short rails.
    segments.push({
      ax: x,
      ay: -HALF_W + CORNER_JAW,
      bx: x,
      by: HALF_W - CORNER_JAW,
      nx: -sx,
      ny: 0,
    });
    knuckles.push({ x, y: -HALF_W + CORNER_JAW }, { x, y: HALF_W - CORNER_JAW });
  }
  // Corner jaws: two facings running diagonally into each corner pocket, narrowing to the throat.
  const d = JAW_DEPTH_M / Math.SQRT2;
  const cornerNarrow = (CORNER_MOUTH_M - CORNER_THROAT_M) / 2 / Math.SQRT2;
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      const cx = sx * HALF_L;
      const cy = sy * HALF_W;
      // Across the mouth, from the long-rail jaw toward the short-rail jaw: (sx, −sy)/√2.
      const lx = cx - sx * CORNER_JAW;
      segments.push(
        jaw(lx, cy, lx + sx * d + sx * cornerNarrow, cy + sy * d - sy * cornerNarrow, sx, -sy),
      );
      const ly = cy - sy * CORNER_JAW;
      segments.push(
        jaw(cx, ly, cx + sx * d - sx * cornerNarrow, ly + sy * d + sy * cornerNarrow, -sx, sy),
      );
    }
  }
  // Every jaw's far tip is a knuckle too.
  for (const s of segments) if (s.ax !== s.bx && s.ay !== s.by) knuckles.push({ x: s.bx, y: s.by });
  return { segments, knuckles };
}

export const TABLE = build();

/** A ball whose centre passes this far beyond the cushion line is in the pocket for good. */
export const POCKET_DROP_M = 0.028575;

export function nearestPocket(x: number, y: number): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  POCKETS.forEach((p, i) => {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
