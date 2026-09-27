/** Bump when the client↔server message or schema contract changes; checked on room join. */
/**
 * 3: seats carry playerId/takeoverOf (reclaim on return); start messages carry `you`.
 * 4: soccer seats carry team + botLevel; matchStart carries teams (2v1 and friends).
 */
export const PROTOCOL_VERSION = 4;

/** Contract name is `RuckusGame`; the host derives this id via `canonicalCasinoGameId`. */
export const CASINO_GAME_ID = 'ruckus';

export const GAME_IDS = ['chickenz', 'pool', 'soccer', 'runner'] as const;
export type GameId = (typeof GAME_IDS)[number];

export const ROOM_CODE_LENGTH = 5;
/** I and O are excluded so codes can't be misread as 1 and 0. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MAX_PLAYERS_PER_MATCH = 4;
