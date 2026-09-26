import type { RunnerRaceStart } from '@arena/protocol/runner';
import { COUNTDOWN_S, type SimEvent, TICK_HZ, type World } from '@arena/sim-runner';

import { useProfile } from '@/app/stores/profile.ts';
import { playMusic } from '@/lib/audio/music.ts';

import { CHASE_TRACK } from '../audio/music.ts';
import { playCue, setWindBed } from '../audio/sfx.ts';
import { BOT_LEVELS, SLOTS } from '../config.ts';
import type { Challenge } from '../net/challenge.ts';
import { useRunnerPrefs } from '../prefs.ts';
import { tutorial } from '../tutorial/director.ts';
import { getDriver } from './runtime.ts';
import { useRunner } from './store.ts';

const BOT_NAMES = ['Dash', 'Zip', 'Blitz', 'Nova', 'Turbo', 'Pixel', 'Comet'] as const;
/** GO! stays up this long once the race starts; FINISH! and WIPEOUT hold before results. */
const GO_HOLD_S = 0.7;
const END_HOLD_S = 2;

let races = 0;
/** Settings → Replay tutorial from the hub: the next Play goes straight into the lessons. */
let lessonsNext = false;
export const queueLessons = () => {
  lessonsNext = true;
};
export const consumeLessonsNext = () => {
  const next = lessonsNext;
  lessonsNext = false;
  return next;
};
/** A "beat my run" challenge to start on the next Play (from the hub's challenge button). */
let challengeNext: Challenge | null = null;
export const queueChallenge = (c: Challenge) => {
  challengeNext = c;
};
export const consumeChallenge = () => {
  const c = challengeNext;
  challengeNext = null;
  return c;
};
/** The challenge being raced right now (for the results board), or null. */
let racing: Challenge | null = null;
export const currentChallenge = () => racing;

export const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;

/** Practice: you (Tomato) against three bots, everyone on the same fresh course. */
export function startRace() {
  const d = getDriver();
  if (!d) return;
  const { level } = useRunnerPrefs.getState();
  const seed = (Date.now() ^ Math.imul(races + 1, 0x9e3779b1)) >>> 0;
  tutorial.stop();
  d.startRace(seed, BOT_LEVELS[level]);
  racing = null;
  const you = useProfile.getState().name || 'You';
  const pick = (i: number) => BOT_NAMES[(races * 3 + i) % BOT_NAMES.length] ?? 'Bot';
  const names = d.world.runners.map((_, i) => (i === 0 ? you : `Bot · ${pick(i)}`));
  races += 1;
  presenter.reset();
  useRunner.getState().set({ status: 'playing', names, announce: null, online: false });
  setWindBed('race');
  playMusic(CHASE_TRACK);
}

/** Beat my run: you against the recorded ghost of a friend's run, on that run's own course. */
export function startChallenge(c: Challenge) {
  const d = getDriver();
  if (!d) return;
  d.startChallenge(c.run);
  racing = c;
  const you = useProfile.getState().name || 'You';
  presenter.reset();
  useRunner
    .getState()
    .set({ status: 'playing', names: [you, `${c.by} (ghost)`], announce: null, online: false });
  setWindBed('race');
  playMusic(CHASE_TRACK);
}

/** A room race: names and bots come from the server; my seat is `slot` (−1 watching). */
export function startOnlineRace(e: RunnerRaceStart, slot: number) {
  const d = getDriver();
  if (!d) return;
  d.startOnline(e.seed, e.bots, slot);
  racing = null;
  presenter.reset();
  useRunner.getState().set({ status: 'playing', names: e.names, announce: null, online: true });
  setWindBed('race');
  playMusic(CHASE_TRACK);
}

/** The hands-on lessons (first visit, or Settings → Replay tutorial). */
export function startLessons() {
  if (!getDriver()) return;
  tutorial.start();
  racing = null;
  presenter.reset();
  const you = useProfile.getState().name || 'You';
  useRunner.getState().set({ status: 'tutorial', names: [you], announce: null, online: false });
  setWindBed('race');
  playMusic(CHASE_TRACK);
}

export function stopRace() {
  tutorial.stop();
  getDriver()?.exhibit();
  presenter.reset();
  useRunner.getState().set({ status: 'off', announce: null, online: false });
}

/**
 * Turns sim state into call-outs each frame: the countdown counts 3-2-1 from the sim's own timer,
 * GO! as it opens, FINISH! or WIPEOUT for you, then the results. Reading state (not timers) keeps
 * online races, where the server owns the clock, presented the same way.
 */
class Presenter {
  private lastCount = -1;
  private lastPhase: World['phase'] | null = null;
  private hold = 0;
  private key = 0;

  reset() {
    this.lastCount = -1;
    this.lastPhase = null;
    this.hold = 0;
  }

  update(w: World, events: readonly SimEvent[], you: number, dt: number, live: boolean) {
    const store = useRunner.getState();
    const say = (text: string, extra: { sub?: string; tone?: string } = {}) => {
      this.key += 1;
      store.set({ announce: { text, ...extra, key: this.key } });
    };
    if (w.phase === 'countdown') {
      const count = Math.ceil(w.phaseTicks / TICK_HZ);
      if (count !== this.lastCount && count <= COUNTDOWN_S && count > 0) {
        this.lastCount = count;
        if (live) {
          say(String(count));
          playCue('runner.count');
        }
      }
    } else if (w.phase === 'run' && this.lastPhase === 'countdown' && live) {
      say('GO!');
      playCue('runner.go');
      this.hold = GO_HOLD_S;
    }
    for (const e of events) {
      if (!live || !('runner' in e) || e.runner !== you) continue;
      if (e.kind === 'finish') {
        say('FINISH!', { sub: ordinal(e.place), tone: e.place === 1 ? '#ffc23a' : SLOTS[0].color });
        this.hold = END_HOLD_S;
      } else if (e.kind === 'hit') {
        this.key += 1;
        store.set({ flash: { kind: e.shielded ? 'shield' : 'hit', key: this.key } });
      } else if (e.kind === 'wipeout') {
        say('WIPEOUT', { sub: 'Out of coins', tone: '#ff2244' });
        this.hold = END_HOLD_S;
      }
    }
    if (w.phase === 'over' && this.lastPhase !== 'over' && live && store.status === 'playing') {
      store.set({ status: 'over' });
    }
    if (this.hold > 0) {
      this.hold -= dt;
      if (this.hold <= 0) store.set({ announce: null });
    }
    this.lastPhase = w.phase;
  }
}

export const presenter = new Presenter();
