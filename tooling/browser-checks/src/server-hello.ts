// S02 connectivity check: join the hello room over WebSocket with the current protocol version, and
// confirm an outdated client is rejected. SERVER_URL defaults to the local server.

import { Client } from '@colyseus/sdk';

import { ROOM } from '@arena/protocol';
import { PROTOCOL_VERSION } from '@arena/shared';

const SERVER_URL = process.env.SERVER_URL ?? 'ws://127.0.0.1:2567';
const client = new Client(SERVER_URL);

try {
  const room = await client.joinOrCreate(ROOM.hello, {
    name: 'probe',
    protocolVersion: PROTOCOL_VERSION,
  });
  await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
  const state = room.state as { protocolVersion: number; players: Map<string, { name: string }> };
  console.info(
    `✓ joined ${ROOM.hello} as ${room.sessionId}; players=${state.players.size}, protocol=${state.protocolVersion}`,
  );
  await room.leave();

  try {
    await client.joinOrCreate(ROOM.hello, { protocolVersion: PROTOCOL_VERSION - 1 });
    throw new Error('outdated client was admitted');
  } catch (error) {
    if (error instanceof Error && error.message === 'outdated client was admitted') throw error;
    console.info(
      `✓ outdated protocol rejected: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  console.info('server check: PASS');
} catch (error) {
  console.error('server check: FAIL', error);
  process.exitCode = 1;
}
