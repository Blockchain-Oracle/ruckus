import { BALL_RADIUS_M, CUE_BALL, F } from '@arena/sim-pool';

import { aim } from './aim.ts';
import { getDirector } from './runtime.ts';

/** Surface height duplicated here to avoid a config import cycle (config imports this module). */
const SURFACE = 0.8;
/** Table view: angled overview from the shooter's side, fitted to a 16:9 screen. */
const TABLE_VIEW = { height: 2.75, back: 1.3, lookZ: 0.12 } as const;
const REF_ASPECT = 16 / 9;
/** Cue view: low and close behind the cue ball. */
const CUE_VIEW = { back: 0.78, height: 0.3, ahead: 0.55 } as const;
/** Smoothing (1/s): the camera glides between views and follows the aim without jitter. */
const RATE = 5;

const cur = { px: 0, py: 3, pz: 1, tx: 0, ty: SURFACE, tz: 0, init: false };
let last = 0;

/**
 * Pool's camera during play: the overview while balls roll or in table view, and a low chase
 * position behind the cue ball in cue view. Smoothed here so the director stays a plain setter.
 */
export function poolPose(
  aspect: number,
): { position: [number, number, number]; target: [number, number, number] } | null {
  const d = getDirector();
  if (!d) return null;
  const now = performance.now() / 1000;
  const dt = last === 0 ? 0 : Math.min(0.1, now - last);
  last = now;
  const b = d.driver.balls;
  const cueView = aim.view === 'cue' && d.driver.phase === 'aim' && d.humanTurn();
  let px: number;
  let py: number;
  let pz: number;
  let tx: number;
  let ty: number;
  let tz: number;
  if (cueView) {
    // World z is −sim y.
    const cx = b[CUE_BALL * 8 + F.x] ?? 0;
    const cz = -(b[CUE_BALL * 8 + F.y] ?? 0);
    px = cx - aim.dx * CUE_VIEW.back;
    pz = cz + aim.dy * CUE_VIEW.back;
    py = SURFACE + CUE_VIEW.height;
    tx = cx + aim.dx * CUE_VIEW.ahead;
    tz = cz - aim.dy * CUE_VIEW.ahead;
    ty = SURFACE + BALL_RADIUS_M;
  } else {
    // Narrow screens back off so the whole table stays in frame.
    const k = Math.max(1, REF_ASPECT / aspect) ** 0.85;
    px = 0;
    py = SURFACE + TABLE_VIEW.height * k;
    pz = TABLE_VIEW.back * k;
    tx = 0;
    ty = SURFACE;
    tz = TABLE_VIEW.lookZ;
  }
  if (!cur.init) {
    Object.assign(cur, { px, py, pz, tx, ty, tz, init: true });
  } else {
    const a = 1 - Math.exp(-RATE * dt);
    cur.px += (px - cur.px) * a;
    cur.py += (py - cur.py) * a;
    cur.pz += (pz - cur.pz) * a;
    cur.tx += (tx - cur.tx) * a;
    cur.ty += (ty - cur.ty) * a;
    cur.tz += (tz - cur.tz) * a;
  }
  return { position: [cur.px, cur.py, cur.pz], target: [cur.tx, cur.ty, cur.tz] };
}

export const resetPoolCamera = () => {
  cur.init = false;
  last = 0;
};
