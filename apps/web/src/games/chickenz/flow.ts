import { useProfile } from '@/app/stores/profile.ts';
import { playMusic } from '@/lib/audio/music.ts';

import { BATTLE_TRACKS } from './audio/music.ts';
import { getDirectors } from './match/runtime.ts';
import { markDone, tutorialDone } from './tutorial/director.ts';
import { useOnboarding } from './tutorial/onboarding.ts';
import { useWager } from './wager/store.ts';

let matches = 0;

/** Straight into a practice match: you vs labelled bots, battle music on. */
export function startMatch() {
  const d = getDirectors();
  if (!d) return;
  useOnboarding.getState().set('none');
  d.match.start(useWager.getState().hero, (Date.now() ^ (matches * 7919)) >>> 0);
  const track = BATTLE_TRACKS[matches % BATTLE_TRACKS.length];
  matches += 1;
  if (track) playMusic(track);
}

/** Play pressed: Chickenz first-run order is tutorial prompt → tutorial → username → play. */
export function onPlay() {
  if (!tutorialDone()) useOnboarding.getState().set('prompt');
  else if (!useProfile.getState().named) useOnboarding.getState().set('username');
  else startMatch();
}

export function startTutorial() {
  const d = getDirectors();
  if (!d) return;
  useOnboarding.getState().set('tutorial');
  d.tutorial.onComplete = afterTutorial;
  d.tutorial.start();
  const track = BATTLE_TRACKS[0];
  if (track) playMusic(track);
}

export function skipTutorial() {
  markDone();
  afterTutorial();
}

function afterTutorial() {
  if (!useProfile.getState().named) useOnboarding.getState().set('username');
  else startMatch();
}

export function stopAll() {
  const d = getDirectors();
  d?.tutorial.stop();
  d?.match.stop();
  useOnboarding.getState().set('none');
}
