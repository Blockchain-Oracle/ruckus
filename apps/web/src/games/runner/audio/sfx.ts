import type { SpriteMap } from '@arena/audio';
import { PICKUPS, type SimEvent } from '@arena/sim-runner';

import { getAudio } from '@/lib/audio/index.ts';

import sfxMap from '../assets/audio/sfx.json';
import sfxM4a from '../assets/audio/sfx.m4a?url';
import sfxWebm from '../assets/audio/sfx.webm?url';

let loading: Promise<void> | null = null;
export function loadRunnerSfx() {
  loading ??= getAudio()
    .loadSprite('runner-sfx', [sfxWebm, sfxM4a], sfxMap as SpriteMap)
    .catch((error: unknown) => {
      loading = null;
      console.warn('Runner SFX unavailable', error);
    });
  return loading;
}

/** Coins taken this close together climb a scale (a coin line sings), up to an octave-ish. */
const COIN_STREAK_S = 0.6;
const COIN_STEPS = [0, 2, 4, 5, 7, 9, 11, 12] as const;
/** Ghosts' sounds sit well under yours (you hear the race without it crowding your run). */
const GHOST_DB = -16;
/** Behind the hub menu the exhibition is ambience, not the foreground. */
let backdropDb = 0;
let coinStreak = 0;
let lastCoinAt = -1;

type Cue = 'runner.count' | 'runner.go' | 'runner.finish';
export const playCue = (name: Cue, gainDb = 0) =>
  getAudio().play(name, {
    bus: 'sfx',
    exact: name === 'runner.count',
    gainDb: gainDb + backdropDb,
  });

/** Sim events → sounds; the focus runner's are full level, everyone else's are quiet. */
export function playRunnerEvents(events: readonly SimEvent[], focus: number, now: number) {
  if (events.length === 0) return;
  const audio = getAudio();
  for (const e of events) {
    if (!('runner' in e)) continue;
    const mine = e.runner === focus;
    const db = backdropDb + (mine ? 0 : GHOST_DB);
    const play = (name: string, gainDb = 0, semitones = 0) =>
      audio.play(name, { bus: 'sfx', gainDb: db + gainDb, semitones });
    switch (e.kind) {
      case 'coin': {
        if (!mine) break;
        coinStreak = now - lastCoinAt < COIN_STREAK_S ? coinStreak + 1 : 0;
        lastCoinAt = now;
        const step = COIN_STEPS[Math.min(coinStreak, COIN_STEPS.length - 1)] ?? 0;
        audio.play('runner.coin', { bus: 'sfx', gainDb: db - 4, semitones: step, exact: true });
        break;
      }
      case 'jump':
        play('runner.jump', -6);
        break;
      case 'land':
        if (e.speed > 6) play('runner.land', -8);
        break;
      case 'slam':
        play('runner.slam', -3);
        break;
      case 'lane':
        if (mine) play('runner.lane', -10);
        break;
      case 'hit':
        play(e.shielded ? 'runner.shield' : 'runner.hit', -2);
        break;
      case 'wipeout':
        play('runner.wipeout');
        break;
      case 'pickup':
        play(PICKUPS[e.pickup].good ? 'runner.buff' : 'runner.debuff', -3);
        if (e.pickup === 'speed') play('runner.boost', -5);
        break;
      case 'finish':
        if (mine) playCue('runner.finish');
        break;
    }
  }
}

/**
 * The rush of air under a race (a seamless loop). The audio context may still be locked (no
 * gesture yet), so the bed (re)starts lazily from the frame loop.
 */
let bed: (() => void) | null = null;
let bedMode: 'off' | 'backdrop' | 'race' = 'off';
export function setWindBed(mode: 'off' | 'backdrop' | 'race') {
  if (mode === bedMode) return;
  bed?.();
  bed = null;
  bedMode = mode;
  backdropDb = mode === 'backdrop' ? -14 : 0;
}
export function keepWindBed() {
  if (bed || bedMode === 'off') return;
  bed = getAudio().play('runner.wind', {
    bus: 'sfx',
    exact: true,
    gainDb: bedMode === 'backdrop' ? -30 : -17,
  });
}
