import type { GameModule } from '@/engine/types.ts';

import { loadSoccerSfx } from './audio/sfx.ts';
import { rig } from './config.ts';
import { soccerModes } from './hud/modes.ts';
import { SoccerOverlay } from './hud/Overlay.tsx';
import { SoccerSettings } from './hud/SoccerSettings.tsx';
import { footballTexture } from './render/toon.ts';
import { SoccerScene } from './Scene.tsx';

export const soccer: GameModule = {
  Scene: SoccerScene,
  rig,
  // The football texture is computed on the CPU: do it behind the scrim, not on the first frame.
  preload: () => Promise.all([loadSoccerSfx(), Promise.resolve().then(footballTexture)]),
  Overlay: SoccerOverlay,
  Settings: SoccerSettings,
  modes: soccerModes,
};
