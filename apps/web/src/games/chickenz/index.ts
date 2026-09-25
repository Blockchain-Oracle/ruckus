import type { GameModule } from '@/engine/types.ts';

import { rig } from './config.ts';
import { ChickenzScene } from './Scene.tsx';
import { loadSprites } from './sprites.ts';

export const chickenz: GameModule = { Scene: ChickenzScene, rig, preload: loadSprites };
