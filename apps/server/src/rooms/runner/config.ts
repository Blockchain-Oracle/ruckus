/** RunnerRoom tuning (ms unless noted). */
export const TICK_MS = 1000 / 60;
/** Snapshots every 3rd tick: 20 Hz corrections under 60 Hz client prediction. */
export const SNAPSHOT_EVERY_TICKS = 3;
/** Seats plus watchers. */
export const MAX_CLIENTS = 10;
/** Labelled bot seats run at practice "Pro". */
export const BOT_SKILL = 65;
export const BOT_NAMES = ['Dash', 'Zip', 'Blitz', 'Nova'] as const;
/** The finish board: read it, then the room returns to its lobby. */
export const OVER_MS = 8_000;
export const MAX_NAME_LENGTH = 16;
