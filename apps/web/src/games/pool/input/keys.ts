import { aim, rotateAim } from '../match/aim.ts';
import { getDirector } from '../match/runtime.ts';

/** Fine aim: degrees per second held (Shift slows it for the last hair). */
const AIM_DEG_S = 40;
const FINE_FACTOR = 0.12;
/** Space charges from 0 to full power over this long. */
const CHARGE_S = 1.3;

const held = new Set<string>();

/** Keyboard play: ←/→ aim, Space hold-and-release to shoot, V swaps the camera view. */
export function attachPoolKeys() {
  const typing = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  };
  const down = (e: KeyboardEvent) => {
    if (typing(e)) return;
    if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyV'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyV' && !e.repeat) aim.view = aim.view === 'table' ? 'cue' : 'table';
    held.add(e.code);
    if (e.shiftKey) held.add('Shift');
  };
  const up = (e: KeyboardEvent) => {
    held.delete(e.code);
    if (!e.shiftKey) held.delete('Shift');
    if (e.code === 'Space' && aim.power > 0) {
      getDirector()?.shootHuman();
      aim.power = 0;
    }
  };
  const blur = () => {
    held.clear();
    aim.power = 0;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    held.clear();
  };
}

/** Per frame: apply held keys (the scene calls this while it's your turn to aim). */
export function applyHeldKeys(dtS: number) {
  const k = held.has('Shift') ? FINE_FACTOR : 1;
  const rad = (AIM_DEG_S * k * Math.PI) / 180;
  if (held.has('ArrowLeft')) rotateAim(rad * dtS);
  if (held.has('ArrowRight')) rotateAim(-rad * dtS);
  if (held.has('Space')) aim.power = Math.min(1, aim.power + dtS / CHARGE_S);
}
