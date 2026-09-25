import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/** Public build-time config (VITE_*). Missing values fail fast at startup instead of at first use. */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_CONVEX_URL: z.url(),
    VITE_SERVER_URL: z.url(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
