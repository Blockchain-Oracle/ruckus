import type { Room } from '@colyseus/sdk';
import { toast } from 'sonner';
import { create } from 'zustand';

/**
 * Staying in the room through a locked phone, a tunnel, or a reload (S34, ADR-009). The server
 * holds a dropped seat for 30–45 s and gives it back to the same *player* (a stable per-device
 * id), so the client's job is to keep trying for that long, then rejoin by code.
 */

const PLAYER_ID_KEY = 'ruckus.playerId';
let memoryId = '';

/** Stable per device; a sandboxed iframe without storage still gets one per visit. */
export function playerId() {
  try {
    const saved = window.localStorage.getItem(PLAYER_ID_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    memoryId ||= crypto.randomUUID();
    return memoryId;
  }
}

/**
 * The SDK retries 0.1 s, 0.2 s … then every `maxDelay`: ~48 s in all, just past the server's
 * lobby grace (the default ran ~56 s at 5 s steps, long after the seat was gone). `minUptime`
 * low so a drop right after joining is still retried.
 */
const RETRY = { maxDelay: 3000, maxRetries: 20, minUptime: 1000 } as const;
/** How long "Back in the room" shows after a reconnect. */
const BACK_MS = 1800;

export type ConnectionState = 'ok' | 'reconnecting' | 'back' | 'lost';

type Connection = {
  state: ConnectionState;
  /** Try the room again (after 'lost'). */
  retry: (() => void) | null;
  set(patch: Partial<Omit<Connection, 'set'>>): void;
};

export const useConnection = create<Connection>()((set) => ({
  state: 'ok',
  retry: null,
  set: (patch) => set(patch),
}));

let backTimer = 0;
function showBack() {
  useConnection.getState().set({ state: 'back', retry: null });
  window.clearTimeout(backTimer);
  backTimer = window.setTimeout(() => {
    if (useConnection.getState().state === 'back') useConnection.getState().set({ state: 'ok' });
  }, BACK_MS);
}

/** Wire a freshly joined room: tuned retries and the reconnecting / back states. */
export function watchRoom(r: Room) {
  Object.assign(r.reconnection, RETRY);
  if (useConnection.getState().state !== 'ok') showBack();
  r.onDrop(() => useConnection.getState().set({ state: 'reconnecting', retry: null }));
  r.onReconnect(showBack);
}

/**
 * The SDK gave up (or the socket closed for good): rejoin by code, which reclaims the seat
 * through the player id. If that fails too, offer a manual retry, and retry by itself when the
 * page comes back to the foreground.
 */
export async function recoverRoom(rejoin: () => Promise<boolean>) {
  const conn = useConnection.getState();
  conn.set({ state: 'reconnecting', retry: null });
  if (await rejoin()) return;
  const retry = () => void recoverRoom(rejoin);
  conn.set({ state: 'lost', retry });
}

export function clearConnection() {
  window.clearTimeout(backTimer);
  useConnection.getState().set({ state: 'ok', retry: null });
}

if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    const { state, retry } = useConnection.getState();
    if (document.visibilityState === 'visible' && state === 'lost') retry?.();
  });

/** "You're the host now": once, when the role passes to this player. */
export function announceHostChange(wasHost: boolean, isHostNow: boolean) {
  if (!wasHost && isHostNow)
    toast("You're the host now", { description: 'You start the next match.' });
}
