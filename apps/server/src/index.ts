import { server } from '#app/app.config.ts';
import { env } from '#app/config/env.ts';

// Colyseus handles SIGTERM itself (graceful shutdown: rooms are disposed, clients get 4001),
// which is why Coolify must start this with `node`, not `pnpm start` (ADR-002).
await server.listen(env.PORT, env.HOST);
console.info(`[server] listening on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
