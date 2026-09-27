/** ChickenzRoom tuning. Timings mirror Chickenz's GameRoom (ms unless noted). */
export const TICK_HZ = 60;
export const TICK_MS = 1000 / TICK_HZ;
/** Snapshots every 3rd tick: 20 Hz corrections under 60 Hz client prediction. */
export const SNAPSHOT_EVERY_TICKS = 3;
/**
 * The new round stays frozen while clients play the diamond wipe (~1.1 s) and the 3-2-1-GO
 * countdown (4 × 350 ms), so everyone's GO! lands together.
 */
export const COUNTDOWN_MS = 2_600;
/** Round over: the survivor taunts, then the transition gap (60 ticks + 750 ms). */
export const ROUND_OVER_MS = 1_000 + 750;
/** Long enough to read the results card before the room returns to its lobby. */
export const MATCH_OVER_MS = 7_000;
export const WINS_TO_TAKE = 3;
export const MAX_SEATS = 4;
export const MIN_PLAYERS_TO_START = 2;
/** Labelled bot seats play at this difficulty (0–100). */
export const BOT_DIFFICULTY = 60;
export const MAX_NAME_LENGTH = 16;
/** 5-letter join codes without look-alikes (no I, O). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 5;
export const HEROES = ['ninja-frog', 'mask-dude', 'pink-man', 'virtual-guy'] as const;
export const MAPS = [0, 1, 2] as const;
