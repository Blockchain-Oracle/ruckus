import {
  type CasinoGameManifestV1,
  type HexString,
  type HostApiV1,
  type HostSnapshotV1,
  SessionPhase,
  type SessionPhaseName,
} from '@chain/casino-sdk';

import { drawClass, getBetTable, maxReservedProfit, payout } from '@arena/casino-math';

import { decodeBet, encodeGameState } from './codec.ts';
import { DEMO } from './constants.ts';
import type { SessionRow } from './sessions.ts';
import { safeStorage } from './storage.ts';

const BPS = 10_000n;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BYTES32_LENGTH = 32;

export type DemoHostOptions = {
  manifest: CasinoGameManifestV1;
  /** VRF stand-in; injectable so tests are deterministic. */
  randomBytes?: (length: number) => Uint8Array;
  schedule?: (callback: () => void, delayMs: number) => void;
  now?: () => number;
};

type Listener = (snapshot: HostSnapshotV1) => void;

function toHex(bytes: Uint8Array): HexString {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function phaseRow(phase: SessionPhaseName): Pick<SessionRow, 'phase' | 'phaseName'> {
  return { phase: SessionPhase[phase], phaseName: phase };
}

/**
 * Standalone stand-in for the chain.wtf host (jam rule: the page must be playable outside the host
 * iframe). Emits production-shaped `HostSnapshotV1`s — WAITING_RANDOMNESS then SETTLED — settles with the
 * exact RuckusGame math from `@arena/casino-math`, and hides winnings from the balance until the guest
 * calls `revealOutcome`, just like the real host. Credits are demo-only and have no value.
 */
export class DemoHost implements HostApiV1 {
  readonly #manifest: CasinoGameManifestV1;
  readonly #randomBytes: (length: number) => Uint8Array;
  readonly #schedule: (callback: () => void, delayMs: number) => void;
  readonly #now: () => number;
  readonly #listeners = new Set<Listener>();
  readonly #unrevealed = new Map<string, bigint>();
  #sessions: SessionRow[] = [];
  #balance: bigint;
  #nextSessionId = 1;

  constructor(options: DemoHostOptions) {
    this.#manifest = options.manifest;
    this.#randomBytes =
      options.randomBytes ?? ((length) => crypto.getRandomValues(new Uint8Array(length)));
    this.#schedule =
      options.schedule ?? ((callback, delayMs) => void setTimeout(callback, delayMs));
    this.#now = options.now ?? Date.now;
    const stored = safeStorage.get(DEMO.storageKey);
    this.#balance = stored !== null && /^\d+$/.test(stored) ? BigInt(stored) : DEMO.startingBalance;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    listener(this.snapshot());
    return () => this.#listeners.delete(listener);
  }

  /** Top-up for the demo only — lets judges keep playing after a losing streak. */
  resetBalance(): void {
    this.#balance = DEMO.startingBalance;
    this.#unrevealed.clear();
    this.#persistAndEmit();
  }

  snapshot(): HostSnapshotV1 {
    const hidden = [...this.#unrevealed.values()].reduce((sum, value) => sum + value, 0n);
    const maxAllowedReservedProfit = (DEMO.availableLiquidity * BigInt(DEMO.maxBetRiskBps)) / BPS;
    return {
      apiVersion: 1,
      integration: {
        chainId: DEMO.chainId,
        slug: 'ruckus-demo',
        gameAddress: ZERO_ADDRESS,
        manifest: this.#manifest,
      },
      wallet: { status: 'ready' },
      token: { symbol: DEMO.tokenSymbol, decimals: DEMO.tokenDecimals },
      balances: { smartVaultBalance: (this.#balance - hidden).toString() },
      casino: {
        availableLiquidity: DEMO.availableLiquidity.toString(),
        maxBetRiskBps: DEMO.maxBetRiskBps,
        maxAllowedReservedProfit: maxAllowedReservedProfit.toString(),
      },
      sessions: { items: this.#sessions },
      ui: { locale: 'en', theme: 'system' },
    };
  }

  async openSession(input: {
    wager: string;
    gameData: HexString;
  }): Promise<{ sessionKey: string; transactionHash: HexString }> {
    const wager = BigInt(input.wager);
    if (wager <= 0n) throw new Error('Wager must be positive');
    if (wager > this.#balance) throw new Error('Insufficient demo balance');
    const bet = decodeBet(input.gameData);
    const limit = (DEMO.availableLiquidity * BigInt(DEMO.maxBetRiskBps)) / BPS;
    if (maxReservedProfit(wager, bet.betType) > limit) throw new Error('BetRiskExceedsLimit');

    await new Promise<void>((resolve) => this.#schedule(resolve, DEMO.openDelayMs));
    this.#balance -= wager;
    const sessionId = String(this.#nextSessionId++);
    const openedAt = this.#now();
    const row: SessionRow = {
      sessionId,
      sessionKey: `${DEMO.chainId}:${sessionId}`,
      gameAddress: ZERO_ADDRESS,
      ...phaseRow('WAITING_RANDOMNESS'),
      wager: wager.toString(),
      stake: wager.toString(),
      isSettled: false,
      openedAt,
      lastEventTimestamp: openedAt,
      raw: {
        gameData: input.gameData,
        gameState: encodeGameState(bet, null, 0n),
        requestId: toHex(this.#randomBytes(BYTES32_LENGTH)),
      },
    };
    this.#sessions = [row, ...this.#sessions];
    this.#persistAndEmit();
    this.#schedule(() => this.#settle(sessionId), DEMO.settleDelayMs);
    return {
      sessionKey: row.sessionKey,
      transactionHash: toHex(this.#randomBytes(BYTES32_LENGTH)),
    };
  }

  async submitAction(): Promise<{ transactionHash: HexString }> {
    throw new Error('RuckusGame bet types have no player actions');
  }

  async cancelStuckRandomness(): Promise<{ transactionHash: HexString }> {
    throw new Error('Demo randomness never gets stuck');
  }

  async revealOutcome(input: { sessionId: string }): Promise<void> {
    if (this.#unrevealed.delete(input.sessionId)) this.#emit();
  }

  #settle(sessionId: string): void {
    const row = this.#sessions.find((session) => session.sessionId === sessionId);
    if (!row?.raw.gameData || !row.wager) return;
    const bet = decodeBet(row.raw.gameData);
    const randomness = toHex(this.#randomBytes(BYTES32_LENGTH));
    const outcomeClass = drawClass(randomness, getBetTable(bet.betType));
    const won = payout(BigInt(row.wager), bet.betType, outcomeClass);
    const settledAt = this.#now();

    this.#balance += won;
    if (won > 0n) this.#unrevealed.set(sessionId, won);
    const settled: SessionRow = {
      ...row,
      ...phaseRow('SETTLED'),
      payout: won.toString(),
      isSettled: true,
      settledAt,
      lastEventTimestamp: settledAt,
      raw: { ...row.raw, randomness, gameState: encodeGameState(bet, outcomeClass, won) },
    };
    this.#sessions = this.#sessions.map((session) =>
      session.sessionId === sessionId ? settled : session,
    );
    this.#persistAndEmit();
  }

  #persistAndEmit(): void {
    safeStorage.set(DEMO.storageKey, this.#balance.toString());
    this.#emit();
  }

  #emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.#listeners) listener(snapshot);
  }
}
