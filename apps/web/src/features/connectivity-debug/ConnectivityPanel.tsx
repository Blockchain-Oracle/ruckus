import { Client } from '@colyseus/sdk';
import { useQuery } from 'convex/react';
import { useEffect, useState } from 'react';

import { api } from '@arena/convex/api';
import { ROOM } from '@arena/protocol';
import { PROTOCOL_VERSION } from '@arena/shared';

import { env } from '@/config/env.ts';
import { useGuestSession } from '@/lib/convex/useGuestSession.ts';

type ServerStatus =
  | { kind: 'connecting' }
  | { kind: 'joined'; sessionId: string }
  | { kind: 'error'; message: string };

/** S02 developer check (`?debug=connectivity`): deployed web → Convex guest auth and → game server. */
export function ConnectivityPanel() {
  const { isLoading, isAuthenticated } = useGuestSession();
  const viewer = useQuery(api.users.viewer);
  const [server, setServer] = useState<ServerStatus>({ kind: 'connecting' });

  useEffect(() => {
    let leave: (() => void) | undefined;
    new Client(env.VITE_SERVER_URL)
      .joinOrCreate(ROOM.hello, { name: 'web', protocolVersion: PROTOCOL_VERSION })
      .then((room) => {
        setServer({ kind: 'joined', sessionId: room.sessionId });
        leave = () => void room.leave();
      })
      .catch((error: unknown) =>
        setServer({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    return () => leave?.();
  }, []);

  return (
    <main
      style={{
        fontFamily: 'ui-monospace, monospace',
        padding: 24,
        background: '#111',
        color: '#e7e7ea',
        minHeight: '100vh',
      }}
    >
      <h1>RUCKUS · connectivity</h1>
      <p data-testid="convex-status">
        convex: {isLoading ? 'loading' : isAuthenticated ? `guest ${viewer ?? '…'}` : 'signing in…'}
      </p>
      <p data-testid="server-status">
        server:{' '}
        {server.kind === 'joined'
          ? `joined ${server.sessionId}`
          : server.kind === 'error'
            ? `error ${server.message}`
            : 'connecting'}
      </p>
    </main>
  );
}
