import { FP_ONE } from '@arena/sim-chickenz';

/** Interpolate a fixed-point view field and return pixels. */
export const lerpPx = (prev: Int32Array, curr: Int32Array, index: number, alpha: number) => {
  const a = prev[index] ?? 0;
  const b = curr[index] ?? 0;
  return (a + (b - a) * alpha) / FP_ONE;
};
