import type { GameModule } from '@/engine/types.ts';

import { loadPoolSfx } from './audio/sfx.ts';
import { rig } from './config.ts';
import { PoolHubActions } from './hud/HubActions.tsx';
import { PoolOverlay } from './hud/Overlay.tsx';
import { loadPoolEnvironment } from './render/Room.tsx';
import { PoolScene } from './Scene.tsx';

export const pool: GameModule = {
  Scene: PoolScene,
  rig,
  preload: () => Promise.all([loadPoolEnvironment(), loadPoolSfx()]),
  Overlay: PoolOverlay,
  HubActions: PoolHubActions,
};
