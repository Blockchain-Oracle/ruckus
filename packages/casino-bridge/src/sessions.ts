import type { HostSnapshotV1 } from '@chain/casino-sdk/guest';

import { type DecodedBet, decodeBet } from './codec.ts';

export type SessionRow = HostSnapshotV1['sessions']['items'][number];
export type RoutedSession = { row: SessionRow; bet: DecodedBet };

const TERMINAL_PHASES = new Set(['SETTLED', 'FORFEITED', 'CANCELLED']);

export function isTerminal(row: SessionRow): boolean {
  return row.isSettled || (row.phaseName !== undefined && TERMINAL_PHASES.has(row.phaseName));
}

export function findSessionByKey(
  snapshot: HostSnapshotV1 | null,
  sessionKey: string,
): SessionRow | undefined {
  return snapshot?.sessions.items.find((row) => row.sessionKey === sessionKey);
}

/** Decodes each row's bet so the UI can route it to the right game/bet presentation. Unknown rows are skipped. */
export function routeSessions(snapshot: HostSnapshotV1 | null): RoutedSession[] {
  const routed: RoutedSession[] = [];
  for (const row of snapshot?.sessions.items ?? []) {
    if (!row.raw.gameData) continue;
    try {
      routed.push({ row, bet: decodeBet(row.raw.gameData) });
    } catch {
      // Another game's session or an unknown bet type — not ours to present.
    }
  }
  return routed;
}
