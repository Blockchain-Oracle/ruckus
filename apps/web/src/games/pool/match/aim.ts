/**
 * The human's live shot setup, mutated every frame by input (kept out of React state; the HUD
 * mirrors the parts it shows through the store).
 */
export const aim = {
  /** Unit aim direction on the table (sim x/y). */
  dx: 1,
  dy: 0,
  /** 0..1 while pulling back the cue. */
  power: 0,
  spinX: 0,
  spinY: 0,
  /** 'table' (overview) or 'cue' (behind the cue ball). */
  view: 'table' as 'table' | 'cue',
};

export const setAimAngle = (dx: number, dy: number) => {
  const l = Math.hypot(dx, dy);
  if (l === 0) return;
  aim.dx = dx / l;
  aim.dy = dy / l;
};

export const rotateAim = (radians: number) => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  setAimAngle(aim.dx * c - aim.dy * s, aim.dx * s + aim.dy * c);
};
