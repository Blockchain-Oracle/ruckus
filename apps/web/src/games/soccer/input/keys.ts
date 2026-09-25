import type { Input } from '@arena/sim-soccer';

/** Fixed bindings, written on screen (How to play card and the first-match hint). */
export const KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
} as const;
const CAPTURED = new Set<string>(Object.values(KEYS).flat());

const down = new Set<string>();
/** On-screen buttons OR in here (see hud/TouchPad.tsx). */
export const pad = { left: false, right: false, jump: false };

const any = (codes: readonly string[]) => codes.some((c) => down.has(c));

/** Level-sampled every sim tick; the last horizontal key pressed wins when both are held. */
let lastH: -1 | 1 = 1;
export function readInput(): Input {
  const left = any(KEYS.left) || pad.left;
  const right = any(KEYS.right) || pad.right;
  const h: -1 | 0 | 1 = left && right ? lastH : left ? -1 : right ? 1 : 0;
  return { h, jump: any(KEYS.jump) || pad.jump };
}

export function attachKeys() {
  const key = (pressed: boolean) => (e: KeyboardEvent) => {
    if (!CAPTURED.has(e.code)) return;
    const target = e.target as HTMLElement | null;
    // Typing a name or chat must never move the egg.
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    if (pressed) {
      down.add(e.code);
      if ((KEYS.left as readonly string[]).includes(e.code)) lastH = -1;
      if ((KEYS.right as readonly string[]).includes(e.code)) lastH = 1;
    } else down.delete(e.code);
  };
  const onDown = key(true);
  const onUp = key(false);
  const clear = () => {
    down.clear();
    pad.left = pad.right = pad.jump = false;
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', clear);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', clear);
    clear();
  };
}
