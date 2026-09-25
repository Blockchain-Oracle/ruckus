import { computeMaxWager } from '@chain/casino-sdk/guest';
import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';

import {
  createRevealGuard,
  decodeGameState,
  encodeBackChickenParams,
  encodeBet,
  isTerminal,
  routeSessions,
} from '@arena/casino-bridge';
import { BET_TYPE, getBetTable, maxMultiplierX } from '@arena/casino-math';

import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

const DEFAULT_WAGER = '1';
const FALLBACK_DECIMALS = 18;

/**
 * Developer harness for S01 (`?debug=casino`): places real bets through the bridge in either host mode
 * and shows raw session rows. Not part of the product UI.
 */
export function CasinoDebugPanel() {
  const { mode, api, snapshot, demo } = useCasinoBridge();
  const [wager, setWager] = useState(DEFAULT_WAGER);
  const [fighter, setFighter] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const decimals = snapshot?.token.decimals ?? FALLBACK_DECIMALS;
  const table = getBetTable(BET_TYPE.backChicken);

  const guard = useMemo(
    () => (api ? createRevealGuard((sessionId) => api.revealOutcome({ sessionId })) : null),
    [api],
  );
  useEffect(() => () => guard?.dispose(), [guard]);

  const sessions = routeSessions(snapshot);
  // The debug harness has no animation: reveal settled rounds immediately.
  useEffect(() => {
    for (const { row } of sessions) if (isTerminal(row)) guard?.reveal(row.sessionId);
  });

  const maxWager = snapshot
    ? computeMaxWager(snapshot, { maxMultiplierX: maxMultiplierX(BET_TYPE.backChicken) })
    : null;

  async function cancelStuck(sessionId: string) {
    try {
      await api?.cancelStuckRandomness({ sessionId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function placeBet() {
    if (!api) return;
    setError(null);
    try {
      await api.openSession({
        wager: parseUnits(wager, decimals).toString(),
        gameData: encodeBet(BET_TYPE.backChicken, encodeBackChickenParams(fighter)),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <main
      style={{
        fontFamily: 'ui-monospace, monospace',
        padding: 24,
        color: '#e7e7ea',
        background: '#111',
        minHeight: '100vh',
      }}
    >
      <h1>RUCKUS · casino debug</h1>
      <p data-testid="bridge-mode">
        mode: <b>{mode}</b> · wallet: {snapshot?.wallet.status ?? '—'} · balance:{' '}
        {snapshot?.balances.smartVaultBalance
          ? formatUnits(BigInt(snapshot.balances.smartVaultBalance), decimals)
          : '—'}{' '}
        {snapshot?.token.symbol ?? ''}
      </p>
      <p>
        max wager:{' '}
        {maxWager?.kind === 'limit'
          ? formatUnits(maxWager.maxWager, decimals)
          : (maxWager?.kind ?? '—')}
      </p>
      <label>
        wager <input value={wager} onChange={(e) => setWager(e.target.value)} size={8} />
      </label>{' '}
      <label>
        fighter{' '}
        <select value={fighter} onChange={(e) => setFighter(Number(e.target.value))}>
          {[0, 1, 2, 3].map((i) => (
            <option key={i} value={i}>
              #{i + 1}
            </option>
          ))}
        </select>
      </label>{' '}
      <button
        type="button"
        disabled={!api || snapshot?.wallet.status !== 'ready'}
        onClick={placeBet}
        data-testid="place-bet"
      >
        Back your chicken
      </button>
      {demo && (
        <button type="button" onClick={() => demo.resetBalance()} style={{ marginLeft: 8 }}>
          reset demo balance
        </button>
      )}
      {snapshot && snapshot.wallet.status !== 'ready' && (
        <p data-testid="wallet-not-ready" style={{ color: '#fc6' }}>
          wallet {snapshot.wallet.status} — betting disabled
        </p>
      )}
      {error && <p style={{ color: '#f66' }}>error: {error}</p>}
      <table data-testid="sessions" style={{ marginTop: 16, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">session</th>
            <th align="left">phase</th>
            <th align="left">wager</th>
            <th align="left">class</th>
            <th align="left">payout</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(({ row }) => {
            const state = row.raw.gameState ? decodeGameState(row.raw.gameState) : null;
            const outcome =
              state?.outcomeClass === null || !state
                ? '…'
                : (table.classes[state.outcomeClass]?.id ?? '?');
            return (
              <tr key={row.sessionKey}>
                <td style={{ paddingRight: 16 }}>{row.sessionKey}</td>
                <td style={{ paddingRight: 16 }}>{row.phaseName}</td>
                <td style={{ paddingRight: 16 }}>
                  {row.wager ? formatUnits(BigInt(row.wager), decimals) : '—'}
                </td>
                <td style={{ paddingRight: 16 }}>{outcome}</td>
                <td>{row.payout ? formatUnits(BigInt(row.payout), decimals) : '—'}</td>
                <td>
                  {row.phaseName === 'WAITING_RANDOMNESS' &&
                    !row.sessionKey.includes('pending') && (
                      <button type="button" onClick={() => cancelStuck(row.sessionId)}>
                        cancel stuck
                      </button>
                    )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
