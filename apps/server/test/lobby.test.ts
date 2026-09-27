import { describe, expect, it } from 'vitest';

import {
  dropOrphanBots,
  KIND,
  type LobbySeat,
  nextHost,
  reclaim,
  returningSeat,
  takeOver,
  validPlayerId,
} from '../src/rooms/lobby.ts';

const ID_A = 'player-aaaaaaaa';
const ID_B = 'player-bbbbbbbb';

const seat = (over: Partial<LobbySeat>): LobbySeat => ({
  slot: 0,
  kind: KIND.human,
  sessionId: 's1',
  name: 'Abu',
  ready: false,
  connected: true,
  playerId: ID_A,
  takeoverOf: '',
  ...over,
});

describe('seat lifecycle (ADR-009)', () => {
  it('a reload mid-match reclaims the dropped seat, never a connected one', () => {
    const seats = [seat({ connected: false }), seat({ slot: 1, sessionId: 's2', playerId: ID_B })];
    expect(returningSeat(seats, ID_A)).toBe(seats[0]);
    // The same id in a second live tab gets no seat of the first's.
    expect(returningSeat([seat({})], ID_A)).toBeUndefined();
  });

  it('a player returning after the grace takes the seat back from its takeover bot', () => {
    const s = seat({});
    takeOver(s);
    expect(s).toMatchObject({ kind: KIND.bot, sessionId: '', takeoverOf: ID_A, name: 'Bot (Abu)' });
    expect(returningSeat([s], ID_A)).toBe(s);
    reclaim(s, 's9', 'Abu');
    expect(s).toMatchObject({
      kind: KIND.human,
      sessionId: 's9',
      connected: true,
      takeoverOf: '',
      name: 'Abu',
    });
  });

  it('orphan takeover bots leave at the lobby; invited bots stay', () => {
    const orphan = seat({ slot: 1 });
    takeOver(orphan);
    const invited = seat({ slot: 2, kind: KIND.bot, sessionId: '', playerId: '' });
    const seats = [seat({}), orphan, invited];
    dropOrphanBots(seats);
    expect(seats).toEqual([seats[0], invited]);
  });

  it('a player with no id still leaves no phantom bot behind', () => {
    const s = seat({ playerId: '' });
    takeOver(s);
    expect(returningSeat([s], '')).toBeUndefined();
    const seats = [s];
    dropOrphanBots(seats);
    expect(seats).toHaveLength(0);
  });

  it('the next host is a connected human other than the one leaving', () => {
    const seats = [
      seat({ sessionId: 'host' }),
      seat({ slot: 1, sessionId: 'gone', connected: false }),
      seat({ slot: 2, kind: KIND.bot, sessionId: '' }),
      seat({ slot: 3, sessionId: 'next' }),
    ];
    expect(nextHost(seats, 'host')).toBe('next');
    expect(nextHost([seat({ kind: KIND.bot, sessionId: '' })])).toBe('');
  });

  it('only well-formed ids can claim a seat', () => {
    expect(validPlayerId(ID_A)).toBe(ID_A);
    for (const bad of ['', 'short', 'has space in it', 42, null, 'x'.repeat(65)])
      expect(validPlayerId(bad)).toBe('');
  });
});
