import { schema, t } from '@colyseus/schema';

/**
 * Runner room (server-authoritative, 60 Hz): a same-seed ghost race. The lobby travels as schema;
 * the race travels as binary: held inputs up, whole-race Float64 snapshots down (see `packWorld`
 * in @arena/sim-runner; the course never travels, every client builds it from the seed).
 */
export const RunnerSeat = schema(
  {
    /** Lobby slot 0–3 (runner colour); RUNNER_WATCHER for spectators. */
    slot: t.uint8(),
    kind: t.string().default('human'),
    sessionId: t.string().default(''),
    name: t.string().default(''),
    ready: t.boolean().default(false),
    connected: t.boolean().default(true),
    wins: t.uint8().default(0),
  },
  'RunnerSeat',
);

export const RunnerRoomState = schema(
  {
    protocolVersion: t.number().default(0),
    code: t.string().default(''),
    hostSessionId: t.string().default(''),
    /** lobby → playing → over → lobby */
    phase: t.string().default('lobby'),
    races: t.uint8().default(0),
    seats: t.array(RunnerSeat),
  },
  'RunnerRoomState',
);

export const RUNNER_PHASE = { lobby: 'lobby', playing: 'playing', over: 'over' } as const;
export const RUNNER_SEAT = { human: 'human', bot: 'bot', waiting: 'waiting' } as const;
export const RUNNER_WATCHER = 255;
export const RUNNER_SEATS = 4;
/** One human can race the bots alone; the room is how friends and watchers join in. */
export const RUNNER_MIN_TO_START = 2;

export const RUNNER_MSG = {
  ready: 'ready',
  addBot: 'addBot',
  removeBot: 'removeBot',
  start: 'start',
  /** client → server bytes: [seq u32 LE][h i8][jump u8][duck u8] */
  input: 'i',
  /** server → client bytes: [ack u32 LE][pad u32][race Float64…] */
  snapshot: 's',
  /** server → client JSON */
  raceStart: 'raceStart',
  raceEnd: 'raceEnd',
} as const;

export const RUNNER_INPUT_BYTES = 7;
export const RUNNER_SNAPSHOT_HEADER_BYTES = 8;

export type RunnerJoinOptions = { protocolVersion: number; name: string; private?: boolean };
/** A race begins: every client builds the identical course and runners, then follows snapshots. */
export type RunnerRaceStart = {
  seed: number;
  /** Per sim slot: bot skill, or −1 for a human seat. */
  bots: number[];
  names: string[];
};
/** Finishing order by sim slot (standings), best first. */
export type RunnerRaceEnd = { order: number[] };
