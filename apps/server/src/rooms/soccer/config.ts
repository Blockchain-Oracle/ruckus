/** SoccerRoom tuning (ms unless noted). */
export const TICK_MS = 1000 / 60;
/** Snapshots every 3rd tick: 20 Hz corrections under 60 Hz client prediction. */
export const SNAPSHOT_EVERY_TICKS = 3;
/** Seats plus watchers. */
export const MAX_CLIENTS = 10;
/** Labelled bot seats play at practice "Pro". */
export const BOT_DIFFICULTY = 65;
export const BOT_NAMES = ['Yolk', 'Shelly', 'Omelette', 'Benedict'] as const;
/** Full time: read the result, then the room returns to its lobby. */
export const OVER_MS = 7_000;
/** Seconds a dropped player keeps their seat before a labelled bot takes over. */
export const RECONNECT_SECONDS = 20;
export const MAX_NAME_LENGTH = 16;
