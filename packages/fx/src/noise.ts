/**
 * Smooth 1D value noise in [-1, 1]. Shake must wander, not jitter: per-frame Math.random reads as
 * static, noise reads as a camera being knocked.
 */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};

export function noise1(seed: number, t: number): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i + seed * 57.3);
  const b = hash(i + 1 + seed * 57.3);
  return a + (b - a) * u;
}
