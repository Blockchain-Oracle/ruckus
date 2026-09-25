import type { GameModule } from '@/engine/types.ts';

import { rig } from './config.ts';
import { ChickenzScene } from './Scene.tsx';

export const chickenz: GameModule = { Scene: ChickenzScene, rig };
