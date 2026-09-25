import { useProfile } from '@/app/stores/profile.ts';
import { useUi } from '@/app/stores/ui.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { playMusic } from '@/lib/audio/music.ts';

import { BATTLE_TRACKS } from './audio/music.ts';
import { getDirectors } from './match/runtime.ts';
import { inRoom } from './net/session.ts';
import { useChickenzPrefs } from './prefs.ts';
import { markDone, tutorialDone } from './tutorial/director.ts';
import { useOnboarding } from './tutorial/onboarding.ts';
import { useWager } from './wager/store.ts';

let matches = 0;
/** Replay tutorial from the hub menu: the next Play goes straight into the lessons. */
let tutorialNext = false;

/** Straight into a practice match: you vs labelled bots, battle music on. */
export function startMatch() {
  const d = getDirectors();
  if (!d) return;
  useOnboarding.getState().set('none');
  d.match.start(useChickenzPrefs.getState().hero, (Date.now() ^ (matches * 7919)) >>> 0);
  const track = BATTLE_TRACKS[matches % BATTLE_TRACKS.length];
  matches += 1;
  if (track) playMusic(track);
}

/** Play pressed: Chickenz first-run order is tutorial prompt → tutorial → username → play. */
export function onPlay() {
  if (tutorialNext) {
    tutorialNext = false;
    startTutorial();
    return;
  }
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

/** Online rooms and a running wager own the screen; the tutorial waits for them. */
export const tutorialReplayable = () => !inRoom() && useWager.getState().phase === 'idle';

/** Settings → Replay tutorial (Chickenz's ⋯ → Tutorial), from the hub or mid-practice. */
export function replayTutorial() {
  if (!tutorialReplayable()) return;
  useUi.getState().openSheet(null);
  const machine = useGameMachine.getState();
  if (machine.phase === 'play') {
    stopAll();
    startTutorial();
  } else if (machine.phase === 'attract') {
    tutorialNext = true;
    machine.send('entering');
  }
}
