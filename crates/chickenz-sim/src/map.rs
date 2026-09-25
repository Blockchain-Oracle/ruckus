//! Maps are 960×540 px on a 16 px grid (Chickenz `packages/sim/src/map.ts`).

use crate::fixed::{fp, Fp};

pub const MAX_PLATFORMS: usize = 8;
pub const NUM_SPAWNS: usize = 4;

#[derive(Clone, Copy, Debug, Default)]
pub struct Platform {
    pub x: Fp,
    pub y: Fp,
    pub w: Fp,
    pub h: Fp,
}

impl Platform {
    const fn px(x: i32, y: i32, w: i32, h: i32) -> Self {
        Platform { x: fp(x), y: fp(y), w: fp(w), h: fp(h) }
    }
    const EMPTY: Platform = Platform { x: 0, y: 0, w: 0, h: 0 };
    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.w == 0 || self.h == 0
    }
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Point {
    pub x: Fp,
    pub y: Fp,
}

const fn pt(x: i32, y: i32) -> Point {
    Point { x: fp(x), y: fp(y) }
}

#[derive(Clone, Debug)]
pub struct Map {
    pub width: Fp,
    pub height: Fp,
    pub platforms: [Platform; MAX_PLATFORMS],
    pub spawns: [Point; NUM_SPAWNS],
    pub weapon_spawns: [Point; NUM_SPAWNS],
}

pub type MapId = u8;
pub const ARENA: MapId = 0;
pub const TOWERS: MapId = 1;
pub const BRIDGES: MapId = 2;
/** Maps in match rotation (and the seed-bank `seed % MAP_COUNT` rule); TUTORIAL is outside it. */
pub const MAP_COUNT: u8 = 3;
pub const TUTORIAL: MapId = 3;

pub fn by_id(id: MapId) -> Map {
    match id {
        TOWERS => towers(),
        BRIDGES => bridges(),
        TUTORIAL => tutorial(),
        _ => arena(),
    }
}

const W: i32 = 960;
const H: i32 = 540;

/// Ground plus 5 floating platforms, symmetric. The classic (and ranked) layout.
pub fn arena() -> Map {
    Map {
        width: fp(W),
        height: fp(H),
        platforms: [
            Platform::px(0, 512, 960, 32),
            Platform::px(128, 416, 176, 16),
            Platform::px(672, 416, 176, 16),
            Platform::px(352, 304, 256, 16),
            Platform::px(64, 208, 144, 16),
            Platform::px(752, 208, 144, 16),
            Platform::EMPTY,
            Platform::EMPTY,
        ],
        spawns: [pt(144, 480), pt(832, 480), pt(432, 272), pt(480, 176)],
        weapon_spawns: [pt(192, 384), pt(736, 384), pt(464, 272), pt(464, 480)],
    }
}

/// Tall towers either side of a bridge: more vertical play.
pub fn towers() -> Map {
    Map {
        width: fp(W),
        height: fp(H),
        platforms: [
            Platform::px(0, 512, 960, 32),
            Platform::px(64, 400, 128, 16),
            Platform::px(80, 256, 144, 16),
            Platform::px(784, 400, 128, 16),
            Platform::px(736, 256, 144, 16),
            Platform::px(304, 336, 352, 16),
            Platform::px(336, 144, 288, 16),
            Platform::EMPTY,
        ],
        spawns: [pt(112, 480), pt(832, 480), pt(432, 304), pt(448, 112)],
        weapon_spawns: [pt(128, 368), pt(848, 368), pt(480, 304), pt(480, 112)],
    }
}

/// Wide bridges at different heights: long horizontal fights.
pub fn bridges() -> Map {
    Map {
        width: fp(W),
        height: fp(H),
        platforms: [
            Platform::px(0, 512, 960, 32),
            Platform::px(240, 416, 480, 16),
            Platform::px(0, 336, 240, 16),
            Platform::px(720, 336, 240, 16),
            Platform::px(176, 240, 608, 16),
            Platform::px(64, 144, 176, 16),
            Platform::px(720, 144, 176, 16),
            Platform::EMPTY,
        ],
        spawns: [pt(112, 480), pt(848, 480), pt(368, 208), pt(608, 208)],
        weapon_spawns: [pt(128, 304), pt(848, 304), pt(480, 384), pt(480, 208)],
    }
}

/// ARENA plus a high platform that only a double jump reaches (Chickenz `TUTORIAL_MAP`).
pub fn tutorial() -> Map {
    let mut m = arena();
    m.platforms[6] = Platform::px(368, 144, 224, 16);
    m
}
