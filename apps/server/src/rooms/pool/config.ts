/** PoolRoom tuning (ms unless noted). */
export const MAX_CLIENTS = 8;
/** Labelled bot seats play at this difficulty (0–100), the same as practice. */
export const BOT_DIFFICULTY = 70;
/** A bot looks at the table this long before its stroke (clients animate the stroke itself). */
export const BOT_THINK_MS = 900;
/** Client stroke animation length for a remote shot, so a bot's result isn't shown early. */
export const STROKE_MS = 1_300;
/** After the last ball drops: read the result card, then the room returns to its lobby. */
export const OVER_MS = 7_000;
export const MAX_NAME_LENGTH = 16;
/** Aim relays are throttled per client (the client sends ~10 Hz). */
export const AIM_MIN_INTERVAL_MS = 60;
