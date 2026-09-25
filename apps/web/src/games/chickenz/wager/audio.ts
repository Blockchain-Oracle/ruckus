import type { SpriteMap } from '@arena/audio';

import { getAudio } from '@/lib/audio/index.ts';

import wagerMap from '../assets/audio/wager.json';
import wagerM4a from '../assets/audio/wager.m4a?url';
import wagerWebm from '../assets/audio/wager.webm?url';

let loading: Promise<void> | null = null;

/** Wager sounds live in the Chickenz chunk and load the first time the bet sheet opens. */
export function loadWagerSounds() {
  loading ??= getAudio()
    .loadSprite('chickenz-wager', [wagerWebm, wagerM4a], wagerMap as SpriteMap)
    .catch((error: unknown) => {
      loading = null;
      console.warn('Wager sounds unavailable', error);
    });
  return loading;
}

let drumroll: (() => void) | null = null;

export function startSuspense() {
  const audio = getAudio();
  // Silence is the strongest suspense tool: the music bed drops away while the drums roll.
  audio.duck(-30);
  drumroll?.();
  drumroll = audio.play('wager.drumroll', { bus: 'sfx', gainDb: -4 });
}

export function stopSuspense() {
  drumroll?.();
  drumroll = null;
  getAudio().unduck();
}

export const playWager = (
  name: 'wager.lock' | 'wager.win' | 'wager.bigwin' | 'wager.lose' | 'wager.coins',
) => getAudio().play(name, { bus: 'sfx' });
