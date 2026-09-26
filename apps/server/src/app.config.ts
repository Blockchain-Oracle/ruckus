import { createEndpoint, createRouter, defineRoom, defineServer } from 'colyseus';

import { ROOM } from '@arena/protocol';
import { PROTOCOL_VERSION } from '@arena/shared';

import { env } from '#app/config/env.ts';
import { ChickenzRoom } from '#app/rooms/chickenz/ChickenzRoom.ts';
import { HelloRoom } from '#app/rooms/hello/HelloRoom.ts';
import { PoolRoom } from '#app/rooms/pool/PoolRoom.ts';
import { RunnerRoom } from '#app/rooms/runner/RunnerRoom.ts';
import { SoccerRoom } from '#app/rooms/soccer/SoccerRoom.ts';

const BOOTED_AT = Date.now();

export const server = defineServer({
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
