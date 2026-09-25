import type { SpriteMap } from '@arena/audio';
import { HALF_WIDTH, playerRadius, type SimEvent, type World } from '@arena/sim-soccer';

import { getAudio } from '@/lib/audio/index.ts';

import sfxMap from '../assets/audio/sfx.json';
import sfxM4a from '../assets/audio/sfx.m4a?url';
import sfxWebm from '../assets/audio/sfx.webm?url';

let loading: Promise<void> | null = null;
export function loadSoccerSfx() {
  loading ??= getAudio()
    .loadSprite('soccer-sfx', [sfxWebm, sfxM4a], sfxMap as SpriteMap)
    .catch((error: unknown) => {
      loading = null;
      console.warn('Soccer SFX unavailable', error);
    });
  return loading;
}

/** Ball speeds (px/s) that play at full level; softer contacts scale down in dB. */
const FULL = { kick: 1000, bounce: 700, post: 700 } as const;
const QUIETEST_DB = -24;
/** The pitch spans 70% of the stereo field. */
const PAN_SPREAD = 0.7;
/** A post this hard (px/s) makes the crowd gasp. */
const OOH_SPEED = 380;
/** Behind the hub menu the exhibition is ambience, not the foreground. */
let backdropDb = 0;

const levelDb = (speed: number, full: number) =>
  Math.max(QUIETEST_DB, 20 * Math.log10(Math.max(1e-3, Math.min(1, speed / full))));
const panAt = (x: number) => (x / HALF_WIDTH) * PAN_SPREAD;

type Cue =
  | 'soccer.count'
  | 'soccer.whistle.kickoff'
  | 'soccer.whistle.fulltime'
  | 'soccer.goal'
  | 'soccer.net';
export const playCue = (name: Cue, gainDb = 0) =>
  getAudio().play(name, {
    bus: 'sfx',
    exact: name === 'soccer.count',
    gainDb: gainDb + backdropDb,
  });

/** Sim events → sounds, placed in stereo where they happened. */
export function playSoccerEvents(events: readonly SimEvent[], w: World) {
  if (events.length === 0) return;
  const audio = getAudio();
  const bx = w.ball.x;
  const play = (name: string, x: number, gainDb = 0, semitones = 0) =>
    audio.play(name, { bus: 'sfx', pan: panAt(x), gainDb: gainDb + backdropDb, semitones });
  for (const e of events) {
    switch (e.kind) {
      case 'kick': {
        const p = w.players[e.player];
        // Off the top of the egg is a header: a softer bonk than a boot.
        const header = p ? w.ball.y > p.y + playerRadius(p) * 0.55 : false;
        play(header ? 'soccer.header' : 'soccer.kick', bx, levelDb(e.speed, FULL.kick));
        break;
      }
      case 'bounce':
        play('soccer.bounce', bx, levelDb(e.speed, FULL.bounce) - 4);
        break;
      case 'post':
        play('soccer.post', bx, levelDb(e.speed, FULL.post));
        if (e.speed > OOH_SPEED) play('soccer.ooh', bx, -4);
        break;
      case 'jump':
        play('soccer.jump', w.players[e.player]?.x ?? 0, -10);
        break;
      case 'powerup': {
        const x = w.players[e.player]?.x ?? bx;
        const name =
          e.power === 'freeze'
            ? 'soccer.freeze'
            : e.power === 'growPlayer' || e.power === 'growBall'
              ? 'soccer.grow'
              : e.power === 'shrinkPlayer' || e.power === 'shrinkBall'
                ? 'soccer.shrink'
                : 'soccer.powerup';
        play(name, x, -2);
        if (name !== 'soccer.powerup') play('soccer.powerup', x, -8);
        break;
      }
      case 'goal':
        play('soccer.net', bx);
        playCue('soccer.goal');
        break;
      case 'whistle':
        if (e.what === 'fulltime') playCue('soccer.whistle.fulltime');
        break;
    }
  }
}

/**
 * The stadium murmur under everything: louder in a match, a hush behind the hub menu. The audio
 * context may still be locked (no gesture yet), so the bed (re)starts lazily from the frame loop.
 */
let bed: (() => void) | null = null;
let bedMode: 'off' | 'backdrop' | 'match' = 'off';
export function setCrowdBed(mode: 'off' | 'backdrop' | 'match') {
  if (mode === bedMode) return;
  bed?.();
  bed = null;
  bedMode = mode;
  backdropDb = mode === 'backdrop' ? -14 : 0;
}
export function keepCrowdBed() {
  if (bed || bedMode === 'off') return;
  bed = getAudio().play('soccer.crowd', {
    bus: 'sfx',
    exact: true,
    gainDb: bedMode === 'backdrop' ? -24 : -12,
  });
}
