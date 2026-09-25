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
