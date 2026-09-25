//! i32 fixed point with 8 fractional bits (256 = 1.0 px). Integer-only maths is what makes the sim
//! bit-identical across native, wasm, browsers and the server.

pub type Fp = i32;
pub const FRAC: u32 = 8;
pub const ONE: Fp = 1 << FRAC;

/// (a * b) >> FRAC, widened so intermediate products can't overflow.
#[inline(always)]
pub fn mul(a: Fp, b: Fp) -> Fp {
    ((a as i64 * b as i64) >> FRAC) as Fp
}

/// Whole pixels to fixed point.
#[inline(always)]
pub const fn fp(px: i32) -> Fp {
    px * ONE
}

/// Fixed point to whole pixels (floor), for bot heuristics that don't need sub-pixel precision.
#[inline(always)]
pub const fn px(v: Fp) -> i32 {
    v >> FRAC
}

/// Integer square root (floor) by Newton's method; used by bots for distances and speeds.
pub fn isqrt(n: i64) -> i64 {
    if n <= 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}
