import { ConvexReactClient } from 'convex/react';

import { env } from '@/config/env.ts';

export const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
