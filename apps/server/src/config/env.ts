import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const DEFAULT_PORT = 2567;

/** Validated at boot so a misconfigured Coolify deploy fails its health check instead of misbehaving. */
export const env = createEnv({
  server: {
    PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    /** Git SHA injected by Coolify; surfaced on /health for deploy verification. */
    SOURCE_COMMIT: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
