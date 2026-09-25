/**
 * Exact-arithmetic helpers. Every function here uses only + − × ÷ and Math.sqrt, which IEEE 754
 * pins down bit for bit, so results match in V8, JavaScriptCore, SpiderMonkey and Node.
 */

const EXP_HALVINGS = 8;
const EXP_SCALE = 2 ** EXP_HALVINGS;

/**
 * e^x from a 7-term Taylor series on x/256, squared back up 8 times. Not the libm value, but the
 * same value everywhere, and within ~1e-10 relative for the |x| < 20 the engine needs.
 */
export function expDet(x: number): number {
  const r = x / EXP_SCALE;
  let term = 1;
  let sum = 1;
  for (let k = 1; k <= 7; k++) {
    term = (term * r) / k;
    sum += term;
  }
  for (let i = 0; i < EXP_HALVINGS; i++) sum *= sum;
  return sum;
}

/** Mulberry32: a tiny 32-bit PRNG with integer-only steps (rack jitter, bot noise). */
export function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const len2 = (x: number, y: number) => Math.sqrt(x * x + y * y);
