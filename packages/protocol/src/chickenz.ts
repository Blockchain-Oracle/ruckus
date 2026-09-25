import { schema, t } from '@colyseus/schema';

/**
 * Chickenz room: synced lobby/meta state via schema; the 60 Hz sim travels as raw binary
 * snapshots (see CHICKENZ_MSG) so the schema stays small and human-readable.
 */
export const ChickenzSeat = schema(
  {
    slot: t.uint8(),
    kind: t.string().default('human'),
    sessionId: t.string().default(''),
    name: t.string().default(''),
    hero: t.string().default('ninja-frog'),
    ready: t.boolean().default(false),
    connected: t.boolean().default(true),
    wins: t.uint8().default(0),
  },
  'ChickenzSeat',
);

export const ChickenzRoomState = schema(
  {
    protocolVersion: t.number().default(0),
    code: t.string().default(''),
    hostSessionId: t.string().default(''),
    /** lobby → countdown → playing → roundOver → (countdown …) → matchOver → lobby */
    phase: t.string().default('lobby'),
    round: t.uint8().default(0),
    winsToTake: t.uint8().default(3),
    seats: t.array(ChickenzSeat),
  },
  'ChickenzRoomState',
);

export const CHICKENZ_PHASE = {
  lobby: 'lobby',
  countdown: 'countdown',
  playing: 'playing',
  roundOver: 'roundOver',
  matchOver: 'matchOver',
} as const;
export type ChickenzPhase = (typeof CHICKENZ_PHASE)[keyof typeof CHICKENZ_PHASE];

export const SEAT_KIND = { human: 'human', bot: 'bot' } as const;

/** Message names. Byte messages carry the sim; JSON ones carry lobby commands and round events. */
export const CHICKENZ_MSG = {
  /** client → server bytes: [seq u32 LE][buttons u8][aimX i8] */
  input: 'i',
  /** server → client bytes: [tick u32][ack u32][inputs 4×(buttons u8, aimX i8)][snapshot…] */
  snapshot: 's',
  ready: 'ready',
  hero: 'hero',
  addBot: 'addBot',
  removeBot: 'removeBot',
  start: 'start',
  emote: 'emote',
  /** server → client JSON */
  roundStart: 'roundStart',
  roundEnd: 'roundEnd',
  matchEnd: 'matchEnd',
} as const;

export type ChickenzJoinOptions = {
  protocolVersion: number;
  name: string;
  hero?: string;
  private?: boolean;
};
export type RoundStartEvent = {
  round: number;
  seed: number;
  mapId: number;
  countdownMs: number;
  players: number;
};
export type RoundEndEvent = { round: number; winner: number; wins: number[] };
export type MatchEndEvent = { winner: number; wins: number[] };

export const SNAPSHOT_HEADER_BYTES = 4 + 4 + 4 * 2;
export const INPUT_BYTES = 4 + 1 + 1;
export const CHICKENZ_MAX_SEATS = 4;
