import type { SoccerMatchStart } from '@arena/protocol/soccer';
import { KICKOFF_FREEZE_S, TICK_HZ, type World } from '@arena/sim-soccer';

import { useProfile } from '@/app/stores/profile.ts';
import { playMusic } from '@/lib/audio/music.ts';

import { STADIUM_TRACK } from '../audio/music.ts';
import { playCue, setCrowdBed } from '../audio/sfx.ts';
import { BOT_LEVELS, KITS } from '../config.ts';
import { useSoccerPrefs } from '../prefs.ts';
import { tutorial } from '../tutorial/director.ts';
import { getDriver } from './runtime.ts';
import { useSoccer } from './store.ts';

const BOT_NAMES = ['Yolk', 'Shelly', 'Omelette', 'Benedict', 'Scramble', 'Humpty'] as const;
/** GO! stays up this long once play starts; GOAL! holds through the goal pause. */
const GO_HOLD_S = 0.7;
/** FULL TIME holds before the results card. */
const FULLTIME_HOLD_S = 2.2;

let matches = 0;
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

/** Practice: you (team Tomato) vs bots, 1v1 or 2v2 with a bot partner. */
export function startMatch() {
  const d = getDriver();
  if (!d) return;
  tutorial.stop();
  const { perTeam, level } = useSoccerPrefs.getState();
  const seed = (Date.now() ^ Math.imul(matches + 1, 0x9e3779b1)) >>> 0;
  d.startMatch(seed, perTeam, BOT_LEVELS[level]);
  const you = useProfile.getState().name || 'You';
  const pick = (i: number) => BOT_NAMES[(matches + i) % BOT_NAMES.length] ?? 'Bot';
  const names = d.world.players.map((_, i) => (i === 0 ? you : `Bot · ${pick(i)}`));
  matches += 1;
  presenter.reset();
  useSoccer.getState().set({ status: 'playing', names, announce: null, online: false });
  setCrowdBed('match');
  playMusic(STADIUM_TRACK);
}

/** A room match: names and bots come from the server; my seat is `slot` (−1 watching). */
export function startOnlineMatch(e: SoccerMatchStart, slot: number) {
  const d = getDriver();
  if (!d) return;
  d.startOnline(e.seed, e.perTeam, e.bots, slot);
  presenter.reset();
  useSoccer.getState().set({ status: 'playing', names: e.names, announce: null, online: true });
  setCrowdBed('match');
  playMusic(STADIUM_TRACK);
}

/** The hands-on lessons (first visit, or Settings → Replay tutorial). */
export function startLessons() {
  if (!getDriver()) return;
  tutorial.start();
  presenter.reset();
  useSoccer.getState().set({
    status: 'tutorial',
    names: [useProfile.getState().name || 'You'],
    announce: null,
    online: false,
  });
  setCrowdBed('match');
  playMusic(STADIUM_TRACK);
}

export function stopMatch() {
  tutorial.stop();
  getDriver()?.exhibit();
  presenter.reset();
  useSoccer.getState().set({ status: 'off', announce: null, online: false });
}

/**
 * Turns sim state into call-outs and cues each frame: the kickoff freeze counts 3-2-1, the whistle
 * blows as play starts, goals and full time get their banners. Reading state (not timers) keeps
 * online play, where the server owns the clock, presented the same way.
 */
class Presenter {
  private lastCount = -1;
  private lastPhase: World['phase'] | null = null;
  private goHold = 0;
  private overHold = 0;
  private key = 0;
  private score: [number, number] = [0, 0];

  reset() {
    this.lastCount = -1;
    this.lastPhase = null;
    this.goHold = 0;
    this.overHold = 0;
    this.score = [0, 0];
  }

  update(w: World, dt: number, live: boolean) {
    const store = useSoccer.getState();
    const say = (text: string, extra: { sub?: string; team?: 0 | 1 } = {}) => {
      this.key += 1;
      store.set({ announce: { text, ...extra, key: this.key } });
    };
    if (w.phase === 'kickoff') {
      const count = Math.ceil(w.phaseTicks / TICK_HZ);
      if (count !== this.lastCount && count <= KICKOFF_FREEZE_S && count > 0) {
        this.lastCount = count;
        if (live) {
          say(String(count));
          playCue('soccer.count');
        }
      }
    } else if (w.phase === 'play' && this.lastPhase === 'kickoff') {
      this.lastCount = -1;
      if (live) {
        say('GO!');
        playCue('soccer.whistle.kickoff');
        this.goHold = GO_HOLD_S;
      }
    } else if (w.phase === 'goal' && this.lastPhase !== 'goal') {
      // Several ticks can run in one frame, so read who scored off the score, not the event list.
      const team: 0 | 1 = w.score[0] > this.score[0] ? 0 : 1;
      if (live) say('GOAL!', { sub: `${w.score[0]} – ${w.score[1]}`, team });
    } else if (w.phase === 'over' && this.lastPhase !== 'over') {
      if (live) {
        // A wager's golden goal has its own result card; only matches switch to results.
        if (store.status === 'playing') store.set({ status: 'over' });
        say(w.score[0] + w.score[1] === 0 ? 'NO GOAL' : 'FULL TIME', {
          sub: `${w.score[0]} – ${w.score[1]}`,
        });
        this.overHold = FULLTIME_HOLD_S;
      }
    }
    if (this.goHold > 0) {
      this.goHold -= dt;
      if (this.goHold <= 0 && store.announce?.text === 'GO!') store.set({ announce: null });
    }
    if (this.overHold > 0) {
      this.overHold -= dt;
      if (this.overHold <= 0) store.set({ announce: null });
    }
    if (w.phase === 'kickoff' && this.lastPhase === 'goal' && live) store.set({ announce: null });
    this.lastPhase = w.phase;
    this.score = [w.score[0], w.score[1]];
  }
}

export const presenter = new Presenter();
export const teamName = (team: 0 | 1) => KITS[team].name;
