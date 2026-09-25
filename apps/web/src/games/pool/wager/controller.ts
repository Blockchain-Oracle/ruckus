import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';

import {
  createRevealGuard,
  decodeGameState,
  encodeBet,
  encodeCallShotParams,
  findSessionByKey,
  isTerminal,
} from '@arena/casino-bridge';
import { BET_TYPE } from '@arena/casino-math';
import { type Shot, TIERS } from '@arena/sim-pool';

import { loadWagerSounds, playWager, startSuspense, stopSuspense } from '@/lib/audio/wager.ts';
import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

import { aim } from '../match/aim.ts';
import { searchMake, searchMiss } from '../match/bot.ts';
import { getDirector } from '../match/runtime.ts';
import { useShotBet } from './store.ts';

const FALLBACK_DECIMALS = 18;
/** Even an instant VRF answer gets this much drumroll (instant results feel untrustworthy). */
const MIN_SUSPENSE_MS = 1_400;
/** A shot needs some pace; a bet placed with the cue at rest plays at this power. */
const DEFAULT_POWER = 0.38;
const TIER_BET_TYPES = [
  BET_TYPE.callShotStraight,
  BET_TYPE.callShotCut,
  BET_TYPE.callShotThin,
  BET_TYPE.callShotLong,
] as const;
const MAKE = 0;

/** The make search is seeded by the table and the stroke only, so a call's make never depends on the bet. */
const makeSeed = (layoutSeed: number, s: Shot) =>
  (Math.imul(layoutSeed, 2654435761) ^ Math.round(s.dx * 1e6) ^ (Math.round(s.dy * 1e6) * 31)) >>>
  0;
/** The miss tremor comes from the VRF word, so the round is reproducible from the chain. */
const wordSeed = (randomness: string) => Number.parseInt(randomness.slice(2, 10), 16) >>> 0;

/** Place a Call Your Shot round: check the call can go in, then open the session. */
export async function placeCallShot(
  api: ReturnType<typeof useCasinoBridge>['api'],
  decimals = FALLBACK_DECIMALS,
) {
  const s = useShotBet.getState();
  const d = getDirector();
  if (!api || !d || !s.call || s.phase !== 'setup') return;
  let wager: bigint;
  try {
    wager = parseUnits(s.stake, decimals);
  } catch {
    toast.error('Enter a stake like 1 or 2.5');
    return;
  }
  const base: Shot = {
    dx: aim.dx,
    dy: aim.dy,
    power: aim.power > 0.05 ? aim.power : DEFAULT_POWER,
    spinX: aim.spinX,
    spinY: aim.spinY,
  };
  const call = s.call;
  s.set({ phase: 'checking' });
  const balls = new Float64Array(d.driver.balls);
  const makeShot = await searchMake(balls, base, call, makeSeed(s.layoutSeed, base));
  if (!makeShot) {
    s.set({ phase: 'setup' });
    toast.error("That one can't go in from here: try another ball or pocket.");
    return;
  }
  void loadWagerSounds();
  playWager('wager.lock');
  s.set({ phase: 'placing', placedAt: Date.now(), base, makeShot });
  startSuspense();
  try {
    const { sessionKey } = await api.openSession({
      wager: wager.toString(),
      gameData: encodeBet(
        TIER_BET_TYPES[TIERS.indexOf(call.tier)] ?? BET_TYPE.callShotLong,
        encodeCallShotParams(call.ball, call.pocket),
      ),
    });
    useShotBet.getState().set({ phase: 'waiting', sessionKey });
  } catch (cause) {
    stopSuspense();
    useShotBet.getState().set({ phase: 'setup' });
    toast.error(cause instanceof Error ? cause.message : 'The bet could not be placed.');
  }
}

/**
 * Watches the host for the settled round, realises the drawn class as a real stroke (a make, or a
 * miss off the jaws), plays it, then shows the result. The reveal guard reports it once.
 */
export function useCallShotController() {
  const { api, snapshot } = useCasinoBridge();
  const phase = useShotBet((s) => s.phase);
  const sessionKey = useShotBet((s) => s.sessionKey);
  const guard = useMemo(
    () => (api ? createRevealGuard((sessionId) => api.revealOutcome({ sessionId })) : null),
    [api],
  );
  useEffect(() => () => guard?.dispose(), [guard]);

  useEffect(() => {
    if (phase !== 'waiting' || !sessionKey) return;
    const row = findSessionByKey(snapshot, sessionKey);
    if (!row || !isTerminal(row)) return;
    const s = useShotBet.getState();
    const d = getDirector();
    if (
      row.phaseName !== 'SETTLED' ||
      !row.raw.randomness ||
      !row.raw.gameState ||
      !d ||
      !s.call ||
      !s.base ||
      !s.makeShot
    ) {
      stopSuspense();
      toast.error('That round was cancelled. Your stake was not taken.');
      s.set({ phase: 'setup' });
      return;
    }
    const state = decodeGameState(row.raw.gameState);
    if (state.outcomeClass === null) return;
    const made = state.outcomeClass === MAKE;
    const call = s.call;
    const balls = new Float64Array(d.driver.balls);
    const result = {
      sessionId: row.sessionId,
      made,
      wager: BigInt(row.wager ?? '0'),
      payout: BigInt(row.payout ?? state.payout.toString()),
      call,
    };
    guard?.arm(row.sessionId);
    let cancelled = false;
    void (async () => {
      const shot = made
        ? s.makeShot
        : await searchMiss(balls, s.base as Shot, call, wordSeed(row.raw.randomness as string));
      const wait = Math.max(0, s.placedAt + MIN_SUSPENSE_MS - Date.now());
      await new Promise((r) => setTimeout(r, wait));
      if (cancelled || !shot) return;
      stopSuspense();
      useShotBet.getState().set({ phase: 'shot', result });
      getDirector()?.playWagerShot(shot, () => {
        useShotBet.getState().set({ phase: 'result' });
        playWager(
          made ? (result.payout >= result.wager * 3n ? 'wager.bigwin' : 'wager.win') : 'wager.lose',
        );
        guard?.reveal(result.sessionId);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, sessionKey, snapshot, guard]);
}
