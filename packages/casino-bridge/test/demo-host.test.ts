import type { CasinoGameManifestV1 } from '@chain/casino-sdk';
import { describe, expect, it, vi } from 'vitest';

import { BET_TYPE } from '@arena/casino-math';

import {
  createRevealGuard,
  DEMO,
  DemoHost,
  decodeGameState,
  encodeBackChickenParams,
  encodeBet,
  routeSessions,
} from '../src/index.ts';

const MANIFEST: CasinoGameManifestV1 = {
  schemaVersion: 1,
  gameId: 'ruckus',
  apiVersion: 1,
  defaultLocale: 'en',
  locales: { en: { name: 'RUCKUS' } },
};
const ONE = 10n ** 18n;

/** A host whose VRF word is fixed and whose timers run only when flushed. */
function makeHost(randomWord: number) {
  const queue: Array<() => void> = [];
  const host = new DemoHost({
    manifest: MANIFEST,
    randomBytes: (length) => {
      const bytes = new Uint8Array(length);
      bytes[length - 1] = randomWord; // ticket = randomWord mod 20
      return bytes;
    },
    schedule: (callback) => queue.push(callback),
    now: () => 1_700_000_000_000,
  });
  const flush = () => {
    while (queue.length) queue.shift()?.();
  };
  host.resetBalance();
  return { host, flush };
}

const backChicken = encodeBet(BET_TYPE.backChicken, encodeBackChickenParams(1));

async function open(host: DemoHost, flush: () => void, wager: bigint) {
  const pending = host.openSession({ wager: wager.toString(), gameData: backChicken });
  flush(); // open delay
  return pending;
}

describe('DemoHost', () => {
  it('settles a top-multiplier win and hides it until revealOutcome', async () => {
    const { host, flush } = makeHost(0); // ticket 0 → flawless win, 6×
    const { sessionKey } = await open(host, flush, 10n * ONE);

    let snapshot = host.snapshot();
    expect(snapshot.sessions.items[0]?.phaseName).toBe('WAITING_RANDOMNESS');
    expect(snapshot.balances.smartVaultBalance).toBe((DEMO.startingBalance - 10n * ONE).toString());

    flush(); // VRF settle
    snapshot = host.snapshot();
    const row = snapshot.sessions.items[0];
    expect(row?.sessionKey).toBe(sessionKey);
    expect(row?.isSettled).toBe(true);
    expect(row?.payout).toBe((60n * ONE).toString());
    expect(decodeGameState(row?.raw.gameState ?? '0x').outcomeClass).toBe(0);
    // Winnings stay hidden until the presentation reveals them — like the real host.
    expect(snapshot.balances.smartVaultBalance).toBe((DEMO.startingBalance - 10n * ONE).toString());

    await host.revealOutcome({ sessionId: row?.sessionId ?? '' });
    expect(host.snapshot().balances.smartVaultBalance).toBe(
      (DEMO.startingBalance + 50n * ONE).toString(),
    );
  });

  it('pays nothing on a loss and needs no reveal', async () => {
    const { host, flush } = makeHost(15); // ticket 15 → lose
    await open(host, flush, 5n * ONE);
    flush();
    const snapshot = host.snapshot();
    expect(snapshot.sessions.items[0]?.payout).toBe('0');
    expect(snapshot.balances.smartVaultBalance).toBe((DEMO.startingBalance - 5n * ONE).toString());
  });

  it('rejects wagers above the balance or with an unknown bet type', async () => {
    const { host } = makeHost(0);
    await expect(
      host.openSession({ wager: (DEMO.startingBalance + 1n).toString(), gameData: backChicken }),
    ).rejects.toThrow('Insufficient');
    await expect(
      host.openSession({ wager: ONE.toString(), gameData: encodeBet(9 as 0, '0x') }),
    ).rejects.toThrow();
  });

  it('routes sessions by decoded bet type', async () => {
    const { host, flush } = makeHost(3);
    await open(host, flush, ONE);
    const routed = routeSessions(host.snapshot());
    expect(routed).toHaveLength(1);
    expect(routed[0]?.bet.betType).toBe(BET_TYPE.backChicken);
  });
});

describe('reveal guard', () => {
  it('reveals exactly once — by presentation, watchdog or dispose', () => {
    vi.useFakeTimers();
    const reveal = vi.fn(async () => {});
    const guard = createRevealGuard(reveal, 1_000);
    guard.arm('a');
    guard.arm('b');
    guard.arm('c');
    guard.reveal('a');
    guard.reveal('a');
    vi.advanceTimersByTime(1_000); // watchdog reveals b and c
    guard.dispose();
    expect(reveal.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'b', 'c']);
    vi.useRealTimers();
  });
});
