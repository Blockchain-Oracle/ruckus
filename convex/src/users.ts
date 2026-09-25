import { getAuthUserId } from '@convex-dev/auth/server';

import { query } from './_generated/server';

/** The signed-in (guest) user's id, or null before sign-in completes. */
export const viewer = query({
  args: {},
  handler: async (ctx) => getAuthUserId(ctx),
});
