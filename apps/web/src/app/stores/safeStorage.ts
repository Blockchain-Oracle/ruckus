import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Sandboxed iframes, private windows and blocked site data can all make localStorage throw.
 * Preferences are a convenience, so every failure degrades to "not remembered".
 */
const guarded: StateStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* not remembered */
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* not remembered */
    }
  },
};

export const safeJSONStorage = createJSONStorage(() => guarded);

/**
 * Auth tokens for Convex Auth, which otherwise reads `window.localStorage` during render and so
 * crashes the whole page inside a sandboxed iframe (the jam gallery's hover preview). Where the
 * browser denies storage, tokens live in memory: signed in for the visit, not remembered.
 */
const memory = new Map<string, string>();
export const safeTokenStorage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};
