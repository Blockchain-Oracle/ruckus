import { useGameMachine } from '@/engine/gameMachine.ts';

import { getDirectors, getDriver } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { HERO_NAMES, HEROES } from '../sprites.ts';
import { isHero } from './heroes.ts';
import { useRoom } from './roomStore.ts';
import { sendInput, setOnlineHandlers } from './session.ts';

/**
 * Bridges server room events into the shared match presentation (HUD, wipe, banners) and the
 * predicted online driver. Installed once while Chickenz is loaded.
 */
export function installOnline() {
  setOnlineHandlers({
    onRoundStart(e) {
      const room = useRoom.getState();
      const seats = [...room.seats].sort((a, b) => a.slot - b.slot);
      const me = seats.find((s) => s.sessionId === room.mySessionId);
      const heroes = seats.map((s) => (isHero(s.hero) ? s.hero : HEROES[0]));
      // Bots are always labelled; a bot that took over a dropped player keeps their name in brackets.
      const names = seats.map((s, i) => {
        if (s.kind !== 'bot') return s.name;
        return s.name.startsWith('Bot (') ? s.name : `Bot · ${HERO_NAMES[heroes[i] ?? HEROES[0]]}`;
      });
      const machine = useGameMachine.getState();
      if (machine.phase === 'attract') machine.send('entering');
      const driver = getDriver();
      if (driver) driver.sendInput = sendInput;
      getDirectors()?.match.onlineRound(
        e.round,
        e.seed,
        e.mapId,
        e.players,
        me?.slot ?? 0,
        heroes,
        names,
        seats.map((s) => s.wins),
      );
    },
    onRoundEnd(e) {
      getDirectors()?.match.onlineRoundEnd(e.winner, e.wins);
    },
    onMatchEnd(e) {
      getDirectors()?.match.onlineMatchEnd(e.winner, e.wins);
    },
    onSnapshot(_tick, ack, remote, body) {
      const driver = getDriver();
      if (driver?.kind === 'online') driver.applySnapshot(ack, remote, body);
    },
  });

  // The server owns the freeze: GO! locally, but birds move only once the room says "playing".
  const unsubscribe = useRoom.subscribe((s, prev) => {
    const driver = getDriver();
    if (driver?.kind !== 'online') return;
    if (s.phase === 'playing' && prev.phase !== 'playing') driver.frozen = false;
    // Back in the room lobby after a match: stand down the match HUD.
    if (s.phase === 'lobby' && prev.phase !== 'lobby') {
      getDirectors()?.match.stop();
      driver.exhibit();
      useGameMachine.getState().send('leaving');
    }
  });
  return () => {
    unsubscribe();
    setOnlineHandlers(null);
  };
}

export const onlineMatchActive = () =>
  useMatch.getState().status !== 'off' && getDirectors()?.match.online === true;
