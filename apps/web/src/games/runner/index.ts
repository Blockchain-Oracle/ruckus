import type { GameModule } from '@/engine/types.ts';

import { loadRunnerSfx } from './audio/sfx.ts';
import { rig } from './config.ts';
import { runnerModes } from './hud/modes.ts';
import { RunnerOverlay } from './hud/Overlay.tsx';
import { RunnerSettings } from './hud/RunnerSettings.tsx';
import { loadRunnerCharacter } from './render/character.ts';
import { RunnerScene } from './Scene.tsx';

export const runner: GameModule = {
  Scene: RunnerScene,
  rig,
  // The character (mesh + clips) must be decoded before the scene clones it.
  preload: () => Promise.all([loadRunnerSfx(), loadRunnerCharacter()]),
  Overlay: RunnerOverlay,
  Settings: RunnerSettings,
  modes: runnerModes,
};
