import type { GameModule } from '@/engine/types.ts';

import { findGame, type GameId } from './registry.ts';

const loaded = new Map<GameId, GameModule>();
const pending = new Map<GameId, Promise<GameModule>>();

/** Idempotent: hover-prefetch and select() share one in-flight import per game. */
export function loadGame(id: GameId): Promise<GameModule> {
  const done = loaded.get(id);
  if (done) return Promise.resolve(done);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const entry = findGame(id);
  if (!entry) return Promise.reject(new Error(`Unknown game ${id}`));
  const p = entry.load().then((m) => {
    loaded.set(id, m);
    pending.delete(id);
    return m;
  });
  pending.set(id, p);
  return p;
}

export const getLoadedGame = (id: GameId | null) => (id ? (loaded.get(id) ?? null) : null);
