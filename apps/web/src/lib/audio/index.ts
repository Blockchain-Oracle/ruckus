import { AudioEngine, type SpriteMap } from '@arena/audio';

import { useSettings } from '@/app/stores/settings.ts';
import hubUiMap from '@/assets/audio/hub-ui.json';
import hubUiM4a from '@/assets/audio/hub-ui.m4a?url';
import hubUiWebm from '@/assets/audio/hub-ui.webm?url';

let engine: AudioEngine | null = null;

/** Lazily created so the AudioContext exists before the first gesture (the unlock needs it). */
export function getAudio(): AudioEngine {
  if (engine) return engine;
  engine = new AudioEngine();
  const apply = (s: ReturnType<typeof useSettings.getState>) => {
    engine?.setVolume('master', s.muted ? 0 : 1);
    engine?.setVolume('music', s.musicVolume);
    engine?.setVolume('sfx', s.sfxVolume);
    engine?.setVolume('ui', s.uiVolume);
  };
  apply(useSettings.getState());
  useSettings.subscribe(apply);
  // UI sounds are tiny (~40 KB) and needed on the very first press, so they load with the engine.
  void engine
    .loadSprite('hub-ui', [hubUiWebm, hubUiM4a], hubUiMap as SpriteMap)
    .catch((error: unknown) => {
      console.warn('UI sounds unavailable', error);
    });
  return engine;
}

/** UI sounds are dry, centred and always on the ui bus. */
export const uiSound = (name: string, semitones = 0) =>
  getAudio().play(name, { bus: 'ui', semitones });
