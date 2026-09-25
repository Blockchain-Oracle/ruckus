import { schema, t } from '@colyseus/schema';

/** S02 connectivity room: proves web → wss → server → Convex end to end. Replaced by real rooms in S05. */
export const HelloPlayer = schema(
  {
    name: t.string().default(''),
    joinedAt: t.number().default(0),
  },
  'HelloPlayer',
);

export const HelloState = schema(
  {
    protocolVersion: t.number().default(0),
    players: t.map(HelloPlayer),
  },
  'HelloState',
);

export type HelloJoinOptions = { name?: string; protocolVersion: number };
