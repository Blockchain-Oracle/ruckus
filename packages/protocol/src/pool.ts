import { schema, t } from '@colyseus/schema';

/**
 * Pool room (8-ball, server-authoritative lockstep). The deterministic engine runs on the server;
 * a shot travels as its parameters and comes back with the exact table it produced, so every
 * client replays it in real time and ends bit-identical.
 */
export const PoolSeat = schema(
  {
    /** 0 or 1 at the table; POOL_WATCHER for spectators. */
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
  'PoolSeat',
);

export const PoolRoomState = schema(
  {
    protocolVersion: t.number().default(0),
    code: t.string().default(''),
    hostSessionId: t.string().default(''),
    /** lobby → playing → over → lobby */
    phase: t.string().default('lobby'),
    racks: t.uint8().default(0),
    seats: t.array(PoolSeat),
  },
  'PoolRoomState',
);

export const POOL_PHASE = { lobby: 'lobby', playing: 'playing', over: 'over' } as const;
export const POOL_SEAT = { human: 'human', bot: 'bot', waiting: 'waiting' } as const;
export const POOL_WATCHER = 255;
export const POOL_PLAYERS = 2;

export const POOL_MSG = {
  ready: 'ready',
  addBot: 'addBot',
  removeBot: 'removeBot',
  start: 'start',
  /** client → server: the shooter's shot (ShotRequest). */
  shot: 'shot',
  /** client → server → others: live aim for watchers (AimUpdate, ~10 Hz). */
  aim: 'aim',
  /** server → clients */
  rack: 'rack',
  played: 'played',
  over: 'over',
} as const;

export type PoolShot = { dx: number; dy: number; power: number; spinX: number; spinY: number };
export type ShotRequest = {
  shot: PoolShot;
  place: { x: number; y: number } | null;
  calledPocket: number;
};
export type AimUpdate = { dx: number; dy: number; power: number; spinX: number; spinY: number };
export type PoolRackState = {
  shooter: 0 | 1;
  groups: [string | null, string | null];
  isBreak: boolean;
  ballInHand: 'none' | 'anywhere' | 'kitchen';
  winner: -1 | 0 | 1;
};
/** A new rack: clients build the identical table from the seed. */
export type RackEvent = {
  seed: number;
  breaker: 0 | 1;
  names: [string, string];
  bots: [boolean, boolean];
  rack: PoolRackState;
  /** The table as raw Float64 bytes (bit-exact, including −0). */
  balls: Uint8Array;
};
/** A shot the server has played: replay it, then snap to `after`. */
export type PlayedEvent = {
  shooter: 0 | 1;
  bot: boolean;
  request: ShotRequest;
  /** The table before the shot (after any ball-in-hand placement): the replay's start. Raw Float64 bytes. */
  before: Uint8Array;
  after: Uint8Array;
  rack: PoolRackState;
  message: string;
  potted: number[];
};
export type OverEvent = { winner: 0 | 1; wins: [number, number] };

export type PoolJoinOptions = {
  protocolVersion: number;
  name: string;
  playerId?: string;
  private?: boolean;
};

/** Tables travel as raw Float64 bytes so every client starts and ends bit-identical. */
export const tableBytes = (balls: Float64Array) =>
  new Uint8Array(balls.buffer.slice(balls.byteOffset, balls.byteOffset + balls.byteLength));
export const tableFrom = (bytes: Uint8Array) => {
  const copy = new Uint8Array(bytes);
  return new Float64Array(copy.buffer, 0, copy.byteLength / 8);
};
