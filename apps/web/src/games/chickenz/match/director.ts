import { H } from '@arena/sim-chickenz';

import { useProfile } from '@/app/stores/profile.ts';

import { playCue } from '../audio/sfx.ts';
import type { ChickenzDriver } from '../sim/driver.ts';
import { HERO_NAMES, HEROES, type Hero } from '../sprites.ts';
import {
  COUNTDOWN_STEP_MS,
  COUNTDOWN_STEPS,
  GO_HOLD_MS,
  MATCH_MAPS,
  MATCH_OVER_MS,
  PRACTICE_BOT_DIFFICULTY,
  PRACTICE_PLAYERS,
  ROUND_OVER_MS,
  ROUND_POPUP_MS,
  WINS_TO_TAKE_MATCH,
  WIPE_HOLD_MS,
  WIPE_IN_MS,
} from './config.ts';
import { useMatch } from './store.ts';

type Timer = { at: number; run: () => void };

/**
 * The round flow of a Chickenz match, on render time: wipe → countdown → play → round banner →
 * next round, until someone takes WINS_TO_TAKE_MATCH rounds. Timers are cancelled wholesale on
 * stop, so leaving mid-countdown can't fire stale steps.
 */
export class MatchDirector {
  private timers: Timer[] = [];
  private now = 0;
  private seed = 1;
  private hero: Hero = HEROES[0];
  private readonly driver: ChickenzDriver;

  constructor(driver: ChickenzDriver) {
    this.driver = driver;
  }

  /** Called by the scene when the current round's sim reaches match over. */
  handleRoundEnd() {
    this.roundOver();
  }

  private after(ms: number, run: () => void) {
    this.timers.push({ at: this.now + ms, run });
  }

  tick(dtMs: number) {
    this.now += dtMs;
    const due = this.timers.filter((t) => t.at <= this.now);
    this.timers = this.timers.filter((t) => t.at > this.now);
    for (const t of due) t.run();
  }

  get active() {
    return useMatch.getState().status !== 'off';
  }

  start(hero: Hero, seed: number) {
    this.timers = [];
    this.hero = hero;
    this.seed = seed >>> 0 || 1;
    // You always take slot 0 with your hero; bots fill the rest with the other heroes.
    const heroes = [hero, ...HEROES.filter((h) => h !== hero)].slice(0, PRACTICE_PLAYERS);
    const you = useProfile.getState().name;
    const names = heroes.map((h, i) => (i === 0 ? you : `Bot · ${HERO_NAMES[h]}`));
    useMatch.getState().set({
      status: 'wipe',
      round: 0,
      wins: heroes.map(() => 0),
      heroes,
      names,
      localSlot: 0,
      winner: -1,
      announce: null,
    });
    this.nextRound(false);
  }

  stop() {
    this.timers = [];
    this.driver.frozen = false;
    useMatch.getState().set({ status: 'off', announce: null, wipe: 0 });
  }

  /** Chickenz swaps maps under the diamond wipe, then counts down on the frozen new round. */
  private nextRound(withWipe = true) {
    const { round } = useMatch.getState();
    const swap = () => {
      this.seed = Math.imul(this.seed ^ (round + 1), 2654435761) >>> 0 || 1;
      this.driver.setMode({
        kind: 'match',
        seed: this.seed,
        mapId: MATCH_MAPS[round % MATCH_MAPS.length] ?? MATCH_MAPS[0],
        players: PRACTICE_PLAYERS,
        humanSlot: 0,
        difficulty: PRACTICE_BOT_DIFFICULTY,
      });
      this.driver.frozen = true;
    };
    if (withWipe) {
      useMatch.getState().set({ status: 'wipe', wipe: 1, announce: null });
      this.after(WIPE_IN_MS, () => {
        swap();
        this.after(WIPE_HOLD_MS, () => {
          useMatch.getState().set({ wipe: 2 });
          this.after(WIPE_IN_MS, () => {
            useMatch.getState().set({ wipe: 0 });
            this.countdown();
          });
        });
      });
    } else {
      swap();
      this.countdown();
    }
  }

  private countdown() {
    useMatch.getState().set({ status: 'countdown' });
    COUNTDOWN_STEPS.forEach((step, i) => {
      this.after(i * COUNTDOWN_STEP_MS, () => {
        useMatch.getState().set({ announce: step });
        const go = step === 'GO!';
        playCue(go ? 'cz.go' : 'cz.countdown');
        if (!go) return;
        this.driver.frozen = false;
        useMatch.getState().set({ status: 'playing' });
        const roundNumber = useMatch.getState().round + 1;
        this.after(GO_HOLD_MS, () => {
          useMatch.getState().set({ announce: `ROUND ${roundNumber}` });
          this.after(ROUND_POPUP_MS, () => {
            if (useMatch.getState().announce === `ROUND ${roundNumber}`)
              useMatch.getState().set({ announce: null });
          });
        });
      });
    });
  }

  private roundOver() {
    const state = useMatch.getState();
    const winner = this.driver.curr[H.winner] ?? -1;
    const wins = [...state.wins];
    if (winner >= 0 && winner < wins.length) wins[winner] = (wins[winner] ?? 0) + 1;
    const name = (state.names[winner] ?? 'Nobody').replace('Bot · ', '').toUpperCase();
    const who = winner === state.localSlot ? 'YOU WIN' : `${name} WINS`;
    const score = wins.join(' - ');
    const matchWon = winner >= 0 && (wins[winner] ?? 0) >= WINS_TO_TAKE_MATCH;
    state.set({
      status: 'roundOver',
      wins,
      winner,
      announce: `Round ${state.round + 1} - ${who}!\n${score}`,
    });
    playCue(matchWon ? 'cz.matchwin' : 'cz.roundwin');

    this.after(ROUND_OVER_MS, () => {
      if (matchWon) {
        const title = winner === state.localSlot ? 'YOU WIN THE MATCH!' : `${name} WINS THE MATCH!`;
        useMatch.getState().set({ status: 'matchOver', announce: title });
        this.after(MATCH_OVER_MS, () => useMatch.getState().set({ announce: null }));
        return;
      }
      useMatch.getState().set({ round: state.round + 1 });
      this.nextRound(true);
    });
  }

  rematch() {
    this.start(this.hero, Math.imul(this.seed, 48271) >>> 0);
  }
}
