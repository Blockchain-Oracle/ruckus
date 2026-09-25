import { CEILING, KICKOFF_FREEZE_S, TICK_HZ } from './constants.ts';
import { tick } from './index.ts';
import { ballRadius, newWorld, playerRadius, type World } from './world.ts';

/**
 * "Call the Finish": a 2v2 bot match plays this long of golden goal. The first goal ends it, and
 * how it went in is its finish class (the order matches FINISH_CLASSES in @arena/casino-math).
 */
export const GOLDEN = { perTeam: 2, skill: 70, playSeconds: 20 } as const;
export const FINISH = { shot: 0, header: 1, wood: 2 } as const;
/** Class index: team × 3 + finish for a goal, or this for none. */
export const NO_GOAL_CLASS = 6;
/** A header meets the ball above this share of the egg's radius over its centre. */
const HEADER_ABOVE = 0.45;

export function goldenWorld(seed: number): World {
  const w = newWorld(
    seed,
    GOLDEN.perTeam,
    Array.from({ length: 4 }, () => GOLDEN.skill),
  );
  w.clock = GOLDEN.playSeconds * TICK_HZ;
  return w;
}

/**
 * Follows a golden-goal world tick by tick and names the finish: a goal off the crossbar or the
 * roof since the last touch is "wood", otherwise a last touch off the top of an egg is a
 * "header", otherwise a "shot".
 */
export class FinishTracker {
  private header = false;
  private wood = false;
  result: number | null = null;

  observe(w: World) {
    if (this.result !== null) return this.result;
    for (const e of w.events) {
      if (e.kind === 'kick') {
        const p = w.players[e.player];
        this.header = p ? w.ball.y > p.y + playerRadius(p) * HEADER_ABOVE : false;
        this.wood = false;
      } else if (e.kind === 'post') this.wood = true;
      else if (e.kind === 'bounce' && w.ball.y >= CEILING - ballRadius(w) - 1) this.wood = true;
      else if (e.kind === 'goal') {
        const finish = this.wood ? FINISH.wood : this.header ? FINISH.header : FINISH.shot;
        this.result = e.team * 3 + finish;
      } else if (e.kind === 'whistle' && e.what === 'fulltime') this.result = NO_GOAL_CLASS;
    }
    return this.result;
  }
}

/** Upper bound on a golden-goal match's length in ticks (kickoff freeze + play). */
export const GOLDEN_MAX_TICKS = (KICKOFF_FREEZE_S + GOLDEN.playSeconds) * TICK_HZ + 1;

/** Plays a bank seed headlessly to its finish class (the bank's CI check and the miner). */
export function finishOf(seed: number): number {
  const w = goldenWorld(seed);
  const t = new FinishTracker();
  for (let i = 0; i < GOLDEN_MAX_TICKS; i++) {
    tick(w);
    const r = t.observe(w);
    if (r !== null) return r;
  }
  return NO_GOAL_CLASS;
}
