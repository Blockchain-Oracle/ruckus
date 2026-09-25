import type { SpriteMap } from '@arena/audio';
import {
  ALIVE_FLAG,
  Button,
  FP_ONE,
  H,
  MAX_PLAYERS,
  P,
  PR,
  playerBase,
  projectileBase,
  WeaponId,
} from '@arena/sim-chickenz';

import { getAudio } from '@/lib/audio/index.ts';

import sfxMap from '../assets/audio/sfx.json';
import sfxM4a from '../assets/audio/sfx.m4a?url';
import sfxWebm from '../assets/audio/sfx.webm?url';
import { MAP_W_PX } from '../config.ts';
import type { Hero } from '../sprites.ts';

let loading: Promise<void> | null = null;
export function loadChickenzSfx() {
  loading ??= getAudio()
    .loadSprite('chickenz-sfx', [sfxWebm, sfxM4a], sfxMap as SpriteMap)
    .catch((error: unknown) => {
      loading = null;
      console.warn('Chickenz SFX unavailable', error);
    });
  return loading;
}

const SHOT_BY_WEAPON: Record<number, string> = {
  [WeaponId.Pistol]: 'cz.shot.pistol',
  [WeaponId.Shotgun]: 'cz.shot.shotgun',
  [WeaponId.Sniper]: 'cz.shot.sniper',
  [WeaponId.Rocket]: 'cz.shot.rocket',
  [WeaponId.Smg]: 'cz.shot.smg',
};
/** Stereo spread: the arena maps to 70% of the stereo field (research §2.4). */
const PAN_SPREAD = 0.7;
/** In the attract backdrop the fight is ambience under the menu, not the foreground. */
const ATTRACT_GAIN_DB = -16;

const panAt = (xFp: number) => ((xFp / FP_ONE / MAP_W_PX) * 2 - 1) * PAN_SPREAD;

/**
 * Chickenz fires its sounds by diffing consecutive states (`AudioManager.detectAudioEvents`);
 * this is the same idea over the flat sim view, extended to every event the port renders.
 */
export function playEvents(
  prev: Int32Array,
  curr: Int32Array,
  heroes: readonly Hero[],
  foreground: boolean,
) {
  if ((curr[H.tick] ?? 0) <= (prev[H.tick] ?? 0)) return;
  const audio = getAudio();
  const gainDb = foreground ? 0 : ATTRACT_GAIN_DB;
  const play = (name: string, xFp: number) =>
    audio.play(name, { bus: 'sfx', gainDb, pan: panAt(xFp) });

  // New projectiles → one shot per weapon per tick (a shotgun's 5 pellets are one blast).
  const prevIds = new Set<number>();
  for (let i = 0; i < (prev[H.projCount] ?? 0); i++)
    prevIds.add(prev[projectileBase(i) + PR.id] ?? -1);
  const currIds = new Set<number>();
  const fired = new Set<number>();
  for (let i = 0; i < (curr[H.projCount] ?? 0); i++) {
    const base = projectileBase(i);
    const id = curr[base + PR.id] ?? -1;
    currIds.add(id);
    const weapon = curr[base + PR.weapon] ?? 0;
    if (!prevIds.has(id) && !fired.has(weapon)) {
      fired.add(weapon);
      const name = SHOT_BY_WEAPON[weapon];
      if (name) play(name, curr[base + PR.x] ?? 0);
    }
  }
  // Rockets that vanished burst (walls, platforms, bodies or expiry all explode).
  for (let i = 0; i < (prev[H.projCount] ?? 0); i++) {
    const base = projectileBase(i);
    if (prev[base + PR.weapon] === WeaponId.Rocket && !currIds.has(prev[base + PR.id] ?? -1)) {
      play('cz.explosion', prev[base + PR.x] ?? 0);
    }
  }

  const n = Math.min(curr[H.playerCount] ?? 0, MAX_PLAYERS);
  for (let slot = 0; slot < n; slot++) {
    const b = playerBase(slot);
    const x = curr[b + P.x] ?? 0;
    const wasAlive = ((prev[b + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    const alive = ((curr[b + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
    if (wasAlive && !alive) play('cz.death', x);
    if (!alive) continue;
    if ((curr[b + P.health] ?? 0) < (prev[b + P.health] ?? 0) && (curr[b + P.stompedBy] ?? -1) < 0)
      play('cz.hit', x);
    const weapon = curr[b + P.weapon] ?? -1;
    if (weapon >= 0 && weapon !== prev[b + P.weapon]) play('cz.pickup', x);
    const jumps = curr[b + P.jumpsLeft] ?? 0;
    if (jumps < (prev[b + P.jumpsLeft] ?? 0)) play(jumps === 0 ? 'cz.doublejump' : 'cz.jump', x);
    const stomped = curr[b + P.stompedBy] ?? -1;
    const wasStomped = prev[b + P.stompedBy] ?? -1;
    if (stomped >= 0 && wasStomped < 0) play('cz.stomp', x);
    if (stomped < 0 && wasStomped >= 0) play('cz.escape', x);
    const buttons = curr[b + P.buttons] ?? 0;
    const hero = heroes[slot];
    if (hero && buttons & Button.Taunt && !((prev[b + P.buttons] ?? 0) & Button.Taunt))
      play(`cz.taunt.${hero}`, x);
  }

  // Sudden death: an alarm the moment the zone starts to close.
  if ((curr[H.zoneLeft] ?? 0) > 0 && (prev[H.zoneLeft] ?? 0) === 0)
    audio.play('cz.zone', { bus: 'sfx', gainDb });
}

export const playCue = (
  name: 'cz.countdown' | 'cz.go' | 'cz.roundwin' | 'cz.matchwin' | 'cz.emote',
) => getAudio().play(name, { bus: 'sfx', exact: true });
