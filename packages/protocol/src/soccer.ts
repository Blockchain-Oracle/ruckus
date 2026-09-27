import { schema, t } from '@colyseus/schema';

/**
 * Soccer room (server-authoritative, 60 Hz). The lobby travels as schema; the match travels as
 * binary: inputs up, whole-world Float64 snapshots down (see `packWorld` in @arena/sim-soccer), so
 * clients predict everything and reconcile to the server's exact numbers.
 */
export const SoccerSeat = schema(
  {
    /** Lobby slot 0–3 (team = slot % 2); SOCCER_WATCHER for spectators. */
    slot: t.uint8(),
    kind: t.string().default('human'),
    sessionId: t.string().default(''),
    name: t.string().default(''),
    ready: t.boolean().default(false),
    connected: t.boolean().default(true),
    wins: t.uint8().default(0),
    /** Stable per-device id (ADR-009): a reload or new tab reclaims this seat. */
    playerId: t.string().default(''),
    /** Set while a labelled bot holds a dropped player's seat; they take it back on return. */
    takeoverOf: t.string().default(''),
  },
  'SoccerSeat',
);

export const SoccerRoomState = schema(
  {
    protocolVersion: t.number().default(0),
    code: t.string().default(''),
    hostSessionId: t.string().default(''),
    /** lobby → playing → over → lobby */
    phase: t.string().default('lobby'),
    matches: t.uint8().default(0),
    seats: t.array(SoccerSeat),
  },
  'SoccerRoomState',
);

export const SOCCER_PHASE = { lobby: 'lobby', playing: 'playing', over: 'over' } as const;
export const SOCCER_SEAT = { human: 'human', bot: 'bot', waiting: 'waiting' } as const;
export const SOCCER_WATCHER = 255;
export const SOCCER_SEATS = 4;
export const SOCCER_MIN_TO_START = 2;

export const SOCCER_MSG = {
  ready: 'ready',
  addBot: 'addBot',
  removeBot: 'removeBot',
  start: 'start',
  /** client → server bytes: [seq u32 LE][h i8][jump u8] */
  input: 'i',
  /** server → client bytes: [ack u32 LE][pad u32][world Float64…] */
  snapshot: 's',
  /** server → client JSON */
  matchStart: 'matchStart',
  matchEnd: 'matchEnd',
} as const;

export const SOCCER_INPUT_BYTES = 6;
export const SOCCER_SNAPSHOT_HEADER_BYTES = 8;

export type SoccerJoinOptions = {
  protocolVersion: number;
  name: string;
  playerId?: string;
  private?: boolean;
};
/** A match begins: every client builds the identical world, then follows snapshots. */
export type SoccerMatchStart = {
  seed: number;
  perTeam: 1 | 2;
  /** Per sim slot: bot difficulty, or −1 for a human seat. */
  bots: number[];
  names: string[];
  /** Per client: this client's sim slot, or −1 watching (seats are renumbered at match start). */
  you: number;
};
export type SoccerMatchEnd = { score: [number, number]; winner: -1 | 0 | 1 };
