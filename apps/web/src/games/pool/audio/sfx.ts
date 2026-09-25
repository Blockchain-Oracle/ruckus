import type { SpriteMap } from '@arena/audio';
import { HALF_L, type ShotEvent } from '@arena/sim-pool';

import { getAudio } from '@/lib/audio/index.ts';

import sfxMap from '../assets/audio/sfx.json';
import sfxM4a from '../assets/audio/sfx.m4a?url';
import sfxWebm from '../assets/audio/sfx.webm?url';

let loading: Promise<void> | null = null;
export function loadPoolSfx() {
  loading ??= getAudio()
    .loadSprite('pool-sfx', [sfxWebm, sfxM4a], sfxMap as SpriteMap)
    .catch((error: unknown) => {
      loading = null;
      console.warn('Pool SFX unavailable', error);
    });
  return loading;
}

/** Impact speed (m/s) at which a sample plays at full level; softer hits scale down in dB. */
const FULL_SPEED = { ball: 3.5, cushion: 2.5, pocket: 1.5 } as const;
const QUIETEST_DB = -30;
/** A break fires dozens of contacts in a few frames; keep the loudest few so it doesn't clip. */
const MAX_PER_FRAME = 6;
/** The table spans 80% of the stereo field. */
const PAN_SPREAD = 0.8;
/** Behind the hub menu the exhibition is room ambience, not the foreground. */
let backdropDb = 0;
export const setPoolBackdrop = (backdrop: boolean) => {
  backdropDb = backdrop ? -14 : 0;
};

const levelDb = (speed: number, full: number) =>
  Math.max(QUIETEST_DB, 20 * Math.log10(Math.max(1e-3, Math.min(1, speed / full))));

/** Positions come from the ball that made the sound (the sim coordinates, x along the table). */
export function playPoolEvents(events: readonly ShotEvent[], xOf: (ball: number) => number) {
  if (events.length === 0) return;
  const audio = getAudio();
  const loudest = [...events].sort((a, b) => b.speed - a.speed).slice(0, MAX_PER_FRAME);
  for (const e of loudest) {
    const pan = (xOf(e.a) / HALF_L) * PAN_SPREAD;
    if (e.kind === 'ball') {
      // Harder hits are brighter: a touch of pitch with speed.
      const semitones = Math.min(2, e.speed * 0.4) - 1;
      audio.play('pool.clack', {
        bus: 'sfx',
        pan,
        semitones,
        gainDb: levelDb(e.speed, FULL_SPEED.ball) + backdropDb,
      });
    } else if (e.kind === 'cushion') {
      audio.play('pool.cushion', {
        bus: 'sfx',
        pan,
        gainDb: levelDb(e.speed, FULL_SPEED.cushion) + backdropDb - 3,
      });
    } else {
      audio.play('pool.pocket', {
        bus: 'sfx',
        pan,
        gainDb: levelDb(Math.max(0.6, e.speed), FULL_SPEED.pocket) + backdropDb,
      });
    }
  }
}

export function playStrike(power: number, x: number) {
  const pan = (x / HALF_L) * PAN_SPREAD;
  const hard = power > 0.8;
  getAudio().play(hard ? 'pool.cue.hard' : 'pool.cue.soft', {
    bus: 'sfx',
    pan,
    gainDb: (hard ? 0 : levelDb(power, 0.7)) + backdropDb,
  });
}
