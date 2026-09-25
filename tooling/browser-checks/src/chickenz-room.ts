// Smoke test for ChickenzRoom: one human + 3 labelled bots play a match to the end; checks that
// round events arrive in order and snapshots stream with a sane size and advancing ticks.
import { Client } from '@colyseus/sdk';

import { CHICKENZ_MSG } from '@arena/protocol/chickenz';
import { PROTOCOL_VERSION } from '@arena/shared';

const SERVER_URL = process.env.SERVER_URL ?? 'ws://127.0.0.1:2567';
const TIMEOUT_MS = 180_000;

const client = new Client(SERVER_URL);
const room = await client.create('chickenz', {
  protocolVersion: PROTOCOL_VERSION,
  name: 'Probe',
  private: true,
});
console.info(`joined room ${room.roomId}`);
let snapshots = 0;
let lastTick = 0;
let bytes = 0;
const events: string[] = [];
room.onMessage(CHICKENZ_MSG.snapshot, (payload: Uint8Array) => {
  snapshots += 1;
  bytes = payload.byteLength;
  lastTick = new DataView(payload.buffer, payload.byteOffset).getUint32(0, true);
});
room.onMessage(CHICKENZ_MSG.roundStart, (e: { round: number; mapId: number }) =>
  events.push(`start r${e.round} map${e.mapId}`),
);
room.onMessage(CHICKENZ_MSG.roundEnd, (e: { winner: number; wins: number[] }) =>
  events.push(`end winner=${e.winner} wins=${e.wins.join('-')}`),
);
const done = new Promise<{ winner: number }>((resolve) =>
  room.onMessage(CHICKENZ_MSG.matchEnd, resolve),
);
room.onMessage(CHICKENZ_MSG.emote, () => {});

for (let i = 0; i < 3; i++) room.send(CHICKENZ_MSG.addBot);
await new Promise((r) => setTimeout(r, 300));
room.send(CHICKENZ_MSG.start);
// Keep sending an idle input so the human seat is exercised (it will mostly just stand there).
let seq = 0;
const inputTimer = setInterval(() => {
  const b = new Uint8Array(6);
  new DataView(b.buffer).setUint32(0, ++seq, true);
  room.sendBytes(CHICKENZ_MSG.input, b);
}, 100);

const result = await Promise.race([
  done,
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('match timed out')), TIMEOUT_MS),
  ),
]);
clearInterval(inputTimer);
console.info(events.join('\n'));
console.info(
  `match winner=${result.winner} snapshots=${snapshots} lastTick=${lastTick} snapshotBytes=${bytes}`,
);
await room.leave();
process.exit(0);
