import { authTables } from '@convex-dev/auth/server';
import { defineSchema } from 'convex/server';

/**
 * S02: auth tables only. Profiles, leaderboards, tournaments, replays and claim codes arrive in S04/S05+.
 * Anonymous (guest) users live in `authTables.users`.
 */
export default defineSchema({
  ...authTables,
});
