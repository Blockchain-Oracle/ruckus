import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { safeJSONStorage } from '@/app/stores/safeStorage.ts';

import { HEROES, type Hero } from './sprites.ts';

/**
 * Chickenz's controls (`apps/client/src/input/InputManager.ts:15-21`): two bindable codes per
 * action. An empty string is an unbound slot (rebinding clears duplicates elsewhere).
 */
export const DEFAULT_BINDINGS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp'],
  shoot: ['Space', 'Mouse0'],
  taunt: ['KeyS', 'ArrowDown'],
} as const satisfies Record<string, readonly [string, string]>;

export type Action = keyof typeof DEFAULT_BINDINGS;
export type Bindings = Record<Action, [string, string]>;
export const ACTIONS = Object.keys(DEFAULT_BINDINGS) as Action[];

const defaults = (): Bindings => ({
  left: [...DEFAULT_BINDINGS.left],
  right: [...DEFAULT_BINDINGS.right],
  jump: [...DEFAULT_BINDINGS.jump],
  shoot: [...DEFAULT_BINDINGS.shoot],
  taunt: [...DEFAULT_BINDINGS.taunt],
});

type Prefs = {
  bindings: Bindings;
  /** Chickenz's "Dynamic Camera" (default on); off shows the whole arena, fixed. */
  dynamicCamera: boolean;
  /** Your bird in practice and the one you ask for when joining a room. */
  hero: Hero;
  bind(action: Action, slot: 0 | 1, code: string): void;
  resetBindings(): void;
  set(patch: Partial<Pick<Prefs, 'dynamicCamera' | 'hero'>>): void;
};

const PREFS_VERSION = 1;

export const useChickenzPrefs = create<Prefs>()(
  persist(
    (set) => ({
      bindings: defaults(),
      dynamicCamera: true,
      hero: HEROES[0],
      bind: (action, slot, code) =>
        set((s) => {
          const next = defaults();
          for (const a of ACTIONS) {
            next[a] = s.bindings[a].map((c, i) =>
              c === code && !(a === action && i === slot) ? '' : c,
            ) as [string, string];
          }
          next[action][slot] = code;
          return { bindings: next };
        }),
      resetBindings: () => set({ bindings: defaults() }),
      set: (patch) => set(patch),
    }),
    {
      name: 'ruckus.chickenz.prefs',
      version: PREFS_VERSION,
      storage: safeJSONStorage,
      // A stored table from an older build may miss actions: fill them from the defaults.
      merge: (stored, current) => {
        const s = (stored ?? {}) as Partial<Prefs>;
        const bindings = defaults();
        for (const a of ACTIONS) {
          const pair = s.bindings?.[a];
          if (Array.isArray(pair) && pair.length === 2)
            bindings[a] = [String(pair[0]), String(pair[1])];
        }
        const hero =
          s.hero && (HEROES as readonly string[]).includes(s.hero) ? s.hero : current.hero;
        return {
          ...current,
          bindings,
          hero,
          dynamicCamera: s.dynamicCamera ?? current.dynamicCamera,
        };
      },
    },
  ),
);

/** Chickenz's `friendlyKeyName` (`InputManager.ts:26-39`). */
export function keyName(code: string): string {
  if (!code) return '—';
  if (code === 'Mouse0') return 'MOUSE1';
  if (code === 'Mouse1') return 'MOUSE3';
  if (code === 'Mouse2') return 'MOUSE2';
  if (code === 'Space') return 'SPACE';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
  if (code.startsWith('Shift')) return 'SHIFT';
  if (code.startsWith('Control')) return 'CTRL';
  if (code.startsWith('Alt')) return 'ALT';
  return code.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}

/** The first bound key for an action, for hints and tutorial text ("Press W to jump"). */
export const primaryKey = (bindings: Bindings, action: Action) =>
  keyName(bindings[action][0] || bindings[action][1]);
