import type { Input } from '@arena/sim-runner';

/** Fixed bindings, written on screen (How to play card and the first-race hint). */
export const KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['KeyW', 'ArrowUp', 'Space'],
  duck: ['KeyS', 'ArrowDown'],
} as const;
type Action = keyof typeof KEYS;

/** A swipe must travel this far (px) within this long (ms); it fires mid-gesture, not on lift. */
const SWIPE_PX = 36;
const SWIPE_MS = 320;
/** A swipe down ducks for this long (phones have no key to hold). */
const TOUCH_DUCK_MS = 480;

const held = new Set<Action>();
/**
 * Presses since the last sim tick: a tap that goes down and up between two ticks still reaches
 * the sim as one tick of held input (the sim finds presses as edges).
 */
const tapped = new Set<Action>();
let lastH: -1 | 1 = 1;
let touchDuckUntil = 0;
/** The touch layer's momentary presses, consumed like taps. */
export const swipe = { left: false, right: false, jump: false };

const actionOf = (code: string): Action | null => {
  for (const a of Object.keys(KEYS) as Action[]) {
    if ((KEYS[a] as readonly string[]).includes(code)) return a;
  }
  return null;
};

/** Sampled once per sim tick. */
export function readInput(): Input {
  const on = (a: Action) => held.has(a) || tapped.has(a);
  const left = on('left') || swipe.left;
  const right = on('right') || swipe.right;
  const h: -1 | 0 | 1 = left && right ? lastH : left ? -1 : right ? 1 : 0;
  const input: Input = {
    h,
    jump: on('jump') || swipe.jump,
    duck: on('duck') || performance.now() < touchDuckUntil,
  };
  tapped.clear();
  swipe.left = swipe.right = swipe.jump = false;
  return input;
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'));
};

/** Swipes on the play area (never on HUD buttons): ← → lanes, ↑ jump, ↓ duck / slam. */
function attachSwipes() {
  let start: { id: number; x: number; y: number; t: number; done: boolean } | null = null;
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const el = e.target as HTMLElement | null;
    if (el?.closest('button, a, input, [role="dialog"]')) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, done: false };
  };
  const move = (e: PointerEvent) => {
    if (!start || start.done || e.pointerId !== start.id) return;
    if (e.timeStamp - start.t > SWIPE_MS) {
      // Too slow for a swipe: measure from here instead, so a hesitant thumb still works.
      start = { ...start, x: e.clientX, y: e.clientY, t: e.timeStamp };
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    start.done = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) swipe.left = true;
      else swipe.right = true;
    } else if (dy < 0) {
      swipe.jump = true;
      touchDuckUntil = 0;
    } else {
      touchDuckUntil = performance.now() + TOUCH_DUCK_MS;
    }
  };
  const up = (e: PointerEvent) => {
    if (start && e.pointerId === start.id) start = null;
  };
  window.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  return () => {
    window.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
}

export function attachKeys() {
  const key = (pressed: boolean) => (e: KeyboardEvent) => {
    const a = actionOf(e.code);
    if (!a || isTyping(e.target)) return;
    e.preventDefault();
    if (!pressed) {
      held.delete(a);
      return;
    }
    if (e.repeat) return;
    held.add(a);
    tapped.add(a);
    if (a === 'left') lastH = -1;
    if (a === 'right') lastH = 1;
  };
  const onDown = key(true);
  const onUp = key(false);
  const clear = () => {
    held.clear();
    tapped.clear();
    touchDuckUntil = 0;
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', clear);
  const detachSwipes = attachSwipes();
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', clear);
    detachSwipes();
    clear();
  };
}
