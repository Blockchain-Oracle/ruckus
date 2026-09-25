import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';

import {
  createRevealGuard,
  decodeGameState,
  encodeBackChickenParams,
  encodeBet,
  findSessionByKey,
  isTerminal,
} from '@arena/casino-bridge';
import { BET_TYPE, bankMapFor, presentationSeed, type SeedBank } from '@arena/casino-math';
import bankJson from '@arena/casino-math/seedbanks/chickenz-back-bird.v1.json';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

import { HEROES } from '../sprites.ts';
import { loadWagerSounds, playWager, startSuspense, stopSuspense } from './audio.ts';
import { MIN_SUSPENSE_MS, PRESENTATION } from './constants.ts';
import { useWager } from './store.ts';

const bank = bankJson as SeedBank;
const FALLBACK_DECIMALS = 18;

/**
 * Runs one Back a Bird round against the casino host (Chain or DemoHost). Mounted once while
 * Chickenz is selected; everything it does is driven by the host snapshot, so a reload mid-round
 * can't double-pay or strand a reveal (the reveal guard covers that).
 */
export function useWagerController() {
  const { api, snapshot } = useCasinoBridge();
  const phase = useWager((s) => s.phase);
  const sessionKey = useWager((s) => s.sessionKey);
  const guard = useMemo(
    () => (api ? createRevealGuard((sessionId) => api.revealOutcome({ sessionId })) : null),
    [api],
  );
  useEffect(() => () => guard?.dispose(), [guard]);

  // WAITING → SETTLED: turn the VRF word into the exhibition that presents the drawn class.
  useEffect(() => {
    if (phase !== 'waiting' || !sessionKey) return;
    const row = findSessionByKey(snapshot, sessionKey);
    if (!row || !isTerminal(row)) return;

    if (row.phaseName !== 'SETTLED' || !row.raw.randomness || !row.raw.gameState) {
      stopSuspense();
      toast.error('That round was cancelled. Your stake was not taken.');
      useWager.getState().reset();
      useGameMachine.getState().send('leaving');
      return;
    }
    const state = decodeGameState(row.raw.gameState);
    if (state.outcomeClass === null) return;
    const seed = presentationSeed(bank, row.raw.randomness, state.outcomeClass);
    const fight = {
      sessionId: row.sessionId,
      seed,
      mapId: bankMapFor(seed, PRESENTATION.mapCount),
      outcomeClass: state.outcomeClass,
      wager: BigInt(row.wager ?? '0'),
      payout: BigInt(row.payout ?? state.payout.toString()),
    };
    guard?.arm(row.sessionId);
    const wait = Math.max(0, useWager.getState().placedAt + MIN_SUSPENSE_MS - Date.now());
    const timer = setTimeout(() => {
      stopSuspense();
      useWager.getState().set({ phase: 'fight', fight, fightDone: false, skipRequested: false });
    }, wait);
    return () => clearTimeout(timer);
  }, [phase, sessionKey, snapshot, guard]);

  return { reveal: (sessionId: string) => guard?.reveal(sessionId) };
}

export async function placeBackABird(
  api: ReturnType<typeof useCasinoBridge>['api'],
  decimals = FALLBACK_DECIMALS,
) {
  const { hero, stake, set, reset } = useWager.getState();
  if (!api) return;
  let wager: bigint;
  try {
    wager = parseUnits(stake, decimals);
  } catch {
    toast.error('Enter a stake like 1 or 2.5');
    return;
  }
  void loadWagerSounds();
  playWager('wager.lock');
  set({ phase: 'placing', sheetOpen: false, placedAt: Date.now() });
  useGameMachine.getState().send('entering');
  // The drumroll starts with the transaction, not after it: the wait *is* the show.
  startSuspense();
  try {
    const { sessionKey } = await api.openSession({
      wager: wager.toString(),
      gameData: encodeBet(BET_TYPE.backChicken, encodeBackChickenParams(HEROES.indexOf(hero))),
    });
    set({ phase: 'waiting', sessionKey });
  } catch (cause) {
    stopSuspense();
    reset();
    useGameMachine.getState().send('leaving');
    toast.error(cause instanceof Error ? cause.message : 'The bet could not be placed.');
  }
}
