import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';

import {
  createRevealGuard,
  decodeGameState,
  encodeBet,
  findSessionByKey,
  isTerminal,
} from '@arena/casino-bridge';
import { type SeedBank, wipeoutPresentation } from '@arena/casino-math';
import bankJson from '@arena/casino-math/seedbanks/runner-wipeout.v1.json';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { loadWagerSounds, playWager, startSuspense, stopSuspense } from '@/lib/audio/wager.ts';
import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

import { presenter } from '../match/flow.ts';
import { getDriver } from '../match/runtime.ts';
import { useRunner } from '../match/store.ts';
import { callAt, WIPEOUT_WEIGHTS } from './calls.ts';
import { useWipeoutBet } from './store.ts';

const bank = bankJson as SeedBank;
const FALLBACK_DECIMALS = 18;
/** Even an instant VRF answer gets this much drumroll (instant results feel untrustworthy). */
const MIN_SUSPENSE_MS = 1_400;
/** After the ending, let the fall (or the finish) land before the result card. */
const RESULT_AFTER_MS = 2_200;
/** The start line behind the call sheet: any bank seed, held before its countdown. */
const LINEUP_SEED = bank.classes[4]?.[0] ?? 1;
const MAKE = 0;
const CLEAN = 4;

/** Open the call sheet over a runner on the gauntlet's start line. */
export function openCallTheWipeout() {
  void loadWagerSounds();
  useWipeoutBet.getState().set({ phase: 'setup', result: null, sessionKey: null });
  getDriver()?.startGauntlet(LINEUP_SEED, true);
  presenter.reset();
  useRunner.getState().set({ status: 'off', names: ['Runner'], announce: null, online: false });
  const machine = useGameMachine.getState();
  if (machine.phase === 'attract') machine.send('entering');
}

export function closeCallTheWipeout() {
  useWipeoutBet.getState().set({ phase: 'off', result: null, sessionKey: null });
  useRunner.getState().set({ announce: null });
  getDriver()?.exhibit();
}

export async function placeWipeoutCall(
  api: ReturnType<typeof useCasinoBridge>['api'],
  decimals = FALLBACK_DECIMALS,
) {
  const s = useWipeoutBet.getState();
  if (!api || s.phase !== 'setup') return;
  let wager: bigint;
  try {
    wager = parseUnits(s.stake, decimals);
  } catch {
    toast.error('Enter a stake like 1 or 2.5');
    return;
  }
  const call = callAt(s.call);
  playWager('wager.lock');
  s.set({ phase: 'placing', placedAt: Date.now() });
  startSuspense();
  try {
    const { sessionKey } = await api.openSession({
      wager: wager.toString(),
      gameData: encodeBet(call.betType, '0x'),
    });
    useWipeoutBet.getState().set({ phase: 'waiting', sessionKey });
  } catch (cause) {
    stopSuspense();
    useWipeoutBet.getState().set({ phase: 'setup' });
    toast.error(cause instanceof Error ? cause.message : 'The bet could not be placed.');
  }
}

/**
 * Watches the host for the settled round, picks the bank gauntlet that shows the drawn outcome,
 * runs it, then shows the result. The reveal guard reports it exactly once.
 */
export function useWipeoutController() {
  const { api, snapshot } = useCasinoBridge();
  const phase = useWipeoutBet((s) => s.phase);
  const sessionKey = useWipeoutBet((s) => s.sessionKey);
  const guard = useMemo(
    () => (api ? createRevealGuard((sessionId) => api.revealOutcome({ sessionId })) : null),
    [api],
  );
  useEffect(() => () => guard?.dispose(), [guard]);

  useEffect(() => {
    if (phase !== 'waiting' || !sessionKey) return;
    const row = findSessionByKey(snapshot, sessionKey);
    if (!row || !isTerminal(row)) return;
    const s = useWipeoutBet.getState();
    const d = getDriver();
    if (row.phaseName !== 'SETTLED' || !row.raw.randomness || !row.raw.gameState || !d) {
      stopSuspense();
      toast.error('That round was cancelled. Your stake was not taken.');
      s.set({ phase: 'setup' });
      return;
    }
    const state = decodeGameState(row.raw.gameState);
    if (state.outcomeClass === null) return;
    const call = callAt(s.call);
    const shown = wipeoutPresentation(
      bank,
      row.raw.randomness,
      call.covers,
      state.outcomeClass,
      WIPEOUT_WEIGHTS,
    );
    const result = {
      sessionId: row.sessionId,
      made: state.outcomeClass === MAKE,
      ending: shown.ending,
      wager: BigInt(row.wager ?? '0'),
      payout: BigInt(row.payout ?? state.payout.toString()),
    };
    guard?.arm(row.sessionId);
    const wait = Math.max(0, s.placedAt + MIN_SUSPENSE_MS - Date.now());
    const timer = setTimeout(() => {
      stopSuspense();
      presenter.reset();
      useWipeoutBet.getState().set({ phase: 'run', result });
      d.startGauntlet(shown.seed, false);
      d.onEnding = (ending) => {
        // Dev evidence for the simulator e2e: what the chain settled vs what the road showed.
        if (import.meta.env.DEV)
          Object.assign(globalThis, {
            __ruckusWipeout: {
              sessionId: result.sessionId,
              outcomeClass: state.outcomeClass,
              expectedEnding: shown.ending,
              playedEnding: ending,
              seed: shown.seed,
              betType: call.betType,
              wager: result.wager.toString(),
              payout: result.payout.toString(),
            },
          });
        useRunner.getState().set({
          announce: {
            text: ending === CLEAN ? 'CLEAN RUN!' : 'WIPEOUT!',
            tone: ending === CLEAN ? '#ffc23a' : '#ff2244',
            key: Date.now(),
          },
        });
        setTimeout(() => {
          d.paused = true;
          useRunner.getState().set({ announce: null });
          useWipeoutBet.getState().set({ phase: 'result' });
          playWager(
            result.made
              ? result.payout >= result.wager * 5n
                ? 'wager.bigwin'
                : 'wager.win'
              : 'wager.lose',
          );
          guard?.reveal(result.sessionId);
        }, RESULT_AFTER_MS);
      };
    }, wait);
    return () => clearTimeout(timer);
  }, [phase, sessionKey, snapshot, guard]);
}
