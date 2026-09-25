/**
 * localStorage can throw or be partitioned inside sandboxed iframes and private windows, so every
 * access is guarded and falls back to memory for the page's lifetime.
 */
const memory = new Map<string, string>();

export const safeStorage = {
  get(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* memory fallback already holds it */
    }
  },
};
