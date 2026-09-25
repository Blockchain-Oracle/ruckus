//! Mulberry32-style integer PRNG, verbatim from Chickenz so the draw sequence is well understood.

/// Draw an integer in [min, max] and return the advanced state.
pub fn int_range(state: u32, min: i32, max: i32) -> (i32, u32) {
    let s = state.wrapping_add(0x6D2B_79F5);
    let t = (s as u64).wrapping_mul((s ^ (s >> 15)) as u64);
    let t = t.wrapping_add(t.wrapping_mul(t | 1));
    let result = ((t ^ (t >> 14)) >> 16) as u32;
    let range = (max - min + 1) as u32;
    let val = ((result as u64 * range as u64) >> 32) as i32;
    (min + val, s)
}

/// A PRNG stream owned by one consumer (the match, or one bot), so streams never interleave.
#[derive(Clone, Copy, Debug)]
pub struct Rng(pub u32);

impl Rng {
    pub fn range(&mut self, min: i32, max: i32) -> i32 {
        let (v, s) = int_range(self.0, min, max);
        self.0 = s;
        v
    }

    /// True with probability `permille`/1000.
    pub fn chance(&mut self, permille: i32) -> bool {
        self.range(0, 999) < permille
    }
}

/// Derive an independent stream (e.g. one per bot) from a seed and a salt.
pub fn derive_seed(seed: u32, salt: u32) -> u32 {
    let mut h: u32 = 0x811C_9DC5;
    for b in seed.to_le_bytes().iter().chain(salt.to_le_bytes().iter()) {
        h ^= *b as u32;
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}
