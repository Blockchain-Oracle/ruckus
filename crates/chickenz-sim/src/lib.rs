//! Deterministic Chickenz simulation for RUCKUS: fixed-point, allocation-free per tick, up to four
//! players free-for-all, with a deterministic bot policy. Derived from Chickenz (MIT, see NOTICE).

pub mod bot;
pub mod combat;
pub mod constants;
pub mod fixed;
pub mod hash;
pub mod map;
pub mod physics;
pub mod prng;
pub mod runner;
pub mod state;
pub mod step;
pub mod tutorial;
pub mod stomp;
pub mod view;
pub mod weapons;

#[cfg(feature = "wasm")]
pub mod wasm;

pub use constants::MAX_PLAYERS;
pub use map::Map;
pub use state::{Config, Input, State};
pub use step::step;
