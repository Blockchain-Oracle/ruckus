import { Button } from '@arena/sim-chickenz';

import { type Action, type Bindings, useChickenzPrefs } from '../prefs.ts';

/**
 * Chickenz's input manager (`apps/client/src/input/InputManager.ts`): level-sampled keys through
 * the player's bindings, aim follows the last horizontal direction, shots go where you face.
 */
const captured = (b: Bindings) => new Set<string>(Object.values(b).flat().filter(Boolean));
let CAPTURED = captured(useChickenzPrefs.getState().bindings);
useChickenzPrefs.subscribe((s) => {
  CAPTURED = captured(s.bindings);
});

export class KeyboardInput {
  private down = new Set<string>();
  /** Touch sticks OR their state in, like Chickenz's `setTouchState`. */
  touch: { buttons(): number; aimX(): number } | null = null;
  private lastAim: -1 | 1 = 1;
  private detach: () => void = () => {};

  attach() {
    const key = (pressed: boolean) => (e: KeyboardEvent) => {
      if (!CAPTURED.has(e.code)) return;
      // Typing in a field (e.g. chat, name) must never drive the bird.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      if (pressed) this.down.add(e.code);
      else this.down.delete(e.code);
    };
    const mouse = (pressed: boolean) => (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !(e.target instanceof HTMLCanvasElement)) return;
      const code = `Mouse${e.button}`;
      if (pressed) this.down.add(code);
      else this.down.delete(code);
    };
    const onDown = key(true);
    const onUp = key(false);
    const onMouseDown = mouse(true);
    const onMouseUp = mouse(false);
    const clear = () => this.down.clear();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('pointerup', onMouseUp);
    window.addEventListener('blur', clear);
    this.detach = () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('pointerup', onMouseUp);
      window.removeEventListener('blur', clear);
      this.down.clear();
    };
  }

  dispose() {
    this.detach();
  }

  private pressed(action: Action) {
    const [a, b] = useChickenzPrefs.getState().bindings[action];
    return (a !== '' && this.down.has(a)) || (b !== '' && this.down.has(b));
  }

  read(): { buttons: number; aimX: -1 | 0 | 1 } {
    let buttons = this.touch?.buttons() ?? 0;
    const touchAim = this.touch?.aimX() ?? 0;
    const left = this.pressed('left');
    const right = this.pressed('right');
    if (left) buttons |= Button.Left;
    if (right) buttons |= Button.Right;
    if (this.pressed('jump')) buttons |= Button.Jump;
    if (this.pressed('shoot')) buttons |= Button.Shoot;
    if (this.pressed('taunt')) buttons |= Button.Taunt;
    if (left && !right) this.lastAim = -1;
    else if (right && !left) this.lastAim = 1;
    if (touchAim) this.lastAim = touchAim > 0 ? 1 : -1;
    return { buttons, aimX: left || right || touchAim ? this.lastAim : 0 };
  }
}
