import lobbyM4a from '@/assets/music/lobby.m4a?url';
import lobbyWebm from '@/assets/music/lobby.webm?url';

import { getAudio } from './index.ts';

/** A track is a list of sources in preference order (Opus/WebM first, AAC fallback). */
export type Track = { id: string; urls: readonly string[] };

export const LOBBY_TRACK: Track = { id: 'lobby', urls: [lobbyWebm, lobbyM4a] };
/** Crossfade between tracks, s. */
const CROSSFADE_S = 1.2;

let current: string | null = null;
let pending: Promise<void> = Promise.resolve();

/**
 * One music bed for the whole hub. Games ask for their track; the hub asks for the lobby loop.
 * Requests are serialised so rapid switches can't leave two tracks playing.
 */
export function playMusic(track: Track) {
  if (current === track.id) return;
  current = track.id;
  pending = pending.then(async () => {
    const audio = getAudio();
    if (current !== track.id) return;
    try {
      audio.stopMusic(CROSSFADE_S);
      await audio.playStems({ main: track.urls }, { main: 0 });
      audio.setLayer('main', 1, CROSSFADE_S);
    } catch (error) {
      console.warn('Music unavailable', error);
    }
  });
}

export function stopMusic() {
  current = null;
  getAudio().stopMusic(CROSSFADE_S);
}
