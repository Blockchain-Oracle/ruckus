import {
  createEndpoint,
  createRouter,
  defineRoom,
  defineServer,
  WebSocketTransport,
} from 'colyseus';

import { ROOM } from '@arena/protocol';
import { PROTOCOL_VERSION } from '@arena/shared';

import { env } from '#app/config/env.ts';
import { ChickenzRoom } from '#app/rooms/chickenz/ChickenzRoom.ts';
import { HelloRoom } from '#app/rooms/hello/HelloRoom.ts';
import { PoolRoom } from '#app/rooms/pool/PoolRoom.ts';
import { RunnerRoom } from '#app/rooms/runner/RunnerRoom.ts';
import { SoccerRoom } from '#app/rooms/soccer/SoccerRoom.ts';

const BOOTED_AT = Date.now();
/**
 * A suspended phone leaves a half-open socket: ping every 2 s so it's noticed in ~6 s and the
 * seat's reconnection grace starts (the default 3 s × 2 retries took ~9 s).
 */
const PING_INTERVAL_MS = 2000;
const PING_MAX_RETRIES = 2;

export const server = defineServer({
  transport: new WebSocketTransport({
    pingInterval: PING_INTERVAL_MS,
    pingMaxRetries: PING_MAX_RETRIES,
  }),
  rooms: {
    [ROOM.hello]: defineRoom(HelloRoom),
    [ROOM.chickenz]: defineRoom(ChickenzRoom),
    [ROOM.pool]: defineRoom(PoolRoom),
    [ROOM.soccer]: defineRoom(SoccerRoom),
    [ROOM.runner]: defineRoom(RunnerRoom),
  },
  routes: createRouter({
    /** Coolify health check (curl inside the container) and uptime monitor. */
    health: createEndpoint('/health', { method: 'GET' }, async () => ({
      status: 'ok' as const,
      protocolVersion: PROTOCOL_VERSION,
      commit: env.SOURCE_COMMIT ?? 'dev',
      uptimeSeconds: Math.round((Date.now() - BOOTED_AT) / 1000),
    })),
  }),
});
