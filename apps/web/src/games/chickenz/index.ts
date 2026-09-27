import { loadChickenz } from '@arena/sim-chickenz';
import wasmUrl from '@arena/sim-chickenz/wasm?url';

import type { GameModule } from '@/engine/types.ts';

import { loadChickenzSfx } from './audio/sfx.ts';
import { rig } from './config.ts';
import { ChickenzSettings } from './hud/ChickenzSettings.tsx';
import { ChickenzScene } from './Scene.tsx';
import { loadSprites } from './sprites.ts';
import { chickenzModes } from './wager/modes.ts';
import { ChickenzOverlay } from './wager/Overlay.tsx';

export const chickenz: GameModule = {
  Scene: ChickenzScene,
  rig,
  preload: () => Promise.all([loadSprites(), loadChickenz(wasmUrl), loadChickenzSfx()]),
  modes: chickenzModes,
  Overlay: ChickenzOverlay,
  Settings: ChickenzSettings,
};
