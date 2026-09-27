/**
 * Seat lifecycle shared by every room (ADR-009; the party room reuses it). A seat belongs to a
 * *player* (a stable per-device id), not to a socket: a dropped phone, a reload or a new tab gets
 * the same seat back, and a labelled bot only keeps it warm meanwhile.
 */

export const KIND = { human: 'human', bot: 'bot', waiting: 'waiting' } as const;

/** The fields every game's seat schema has (protocol: *Seat). */
export type LobbySeat = {
  slot: number;
  kind: string;
  sessionId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  playerId: string;
  takeoverOf: string;
};

/** Seconds a dropped seat is held: longer in the lobby, where nothing waits on it. */
export const GRACE_LOBBY_S = 45;
export const GRACE_MATCH_S = 30;
/** A dropped host keeps the role this long before the next connected player gets it. */
export const HOST_HANDOVER_MS = 10_000;

const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;
/** takeoverOf for a player without an id: never matches a valid id, still an orphan to clear. */
const NO_OWNER = '-';
/** Join options are client input: only a well-formed id can claim a seat. */
export const validPlayerId = (id: unknown): string =>
  typeof id === 'string' && PLAYER_ID.test(id) ? id : '';

/**
 * The seat a returning player left: dropped and still held, or already handed to a takeover bot.
 * A connected seat is never taken (the same id in two tabs keeps both honest: the second gets a
 * seat of its own).
 */
export function returningSeat<S extends LobbySeat>(seats: Iterable<S>, playerId: string) {
  if (!playerId) return undefined;
  for (const s of seats) {
    if (s.playerId !== playerId) continue;
    if (s.kind === KIND.bot && s.takeoverOf === playerId) return s;
    if (s.kind === KIND.human && !s.connected) return s;
  }
  return undefined;
}

/** Give a seat back to its player on a new session. */
export function reclaim(seat: LobbySeat, sessionId: string, name: string) {
  seat.kind = KIND.human;
  seat.sessionId = sessionId;
  seat.name = name;
  seat.connected = true;
  seat.takeoverOf = '';
}

/** A dropped player's seat mid-match: a labelled bot plays on until they come back. */
export function takeOver(seat: LobbySeat) {
  // No id (an older client): nobody can reclaim it, but it must still leave at the next lobby.
  seat.takeoverOf = seat.playerId || NO_OWNER;
  seat.kind = KIND.bot;
  seat.sessionId = '';
  seat.connected = true;
  seat.name = `Bot (${seat.name})`;
}

/** Back in the lobby, takeover bots whose players never returned go (they were never invited). */
export function dropOrphanBots<S extends LobbySeat>(seats: {
  splice(i: number, n: number): unknown;
  length: number;
  [i: number]: S | undefined;
}) {
  for (let i = seats.length - 1; i >= 0; i--) {
    const s = seats[i];
    if (s && s.kind === KIND.bot && s.takeoverOf) seats.splice(i, 1);
  }
}

/** The next host: the first connected human (never a bot, never a dropped seat). */
export function nextHost<S extends LobbySeat>(seats: Iterable<S>, except = '') {
  for (const s of seats)
    if (s.kind === KIND.human && s.connected && s.sessionId && s.sessionId !== except)
      return s.sessionId;
  return '';
}
