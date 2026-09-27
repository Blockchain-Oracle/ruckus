import { Color } from 'three/webgpu';
import { create } from 'zustand';

import type { StadiumLook } from './stadium.ts';

/** The mounted scene's look (null between scenes: StadiumPost renders plainly). */
export const useStadium = create<{ look: StadiumLook | null }>(() => ({ look: null }));

/**
 * A full-screen flash that fades on its own (a hit, a shield, a wipeout). Render-only: it never
 * feeds back into a sim, so wall-clock decay is fine here.
 */
export const flash = { color: new Color('#ffffff'), amount: 0 };

export function hitFlash(color: string, amount = 0.6) {
  flash.color.set(color);
  flash.amount = Math.max(flash.amount, amount);
}
