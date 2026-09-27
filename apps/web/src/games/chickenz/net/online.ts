import { isChickenzEmote } from '@arena/protocol/chickenz';

import { useGameMachine } from '@/engine/gameMachine.ts';

import { fromRoom } from '../emotes/emotes.ts';
import { getDirectors, getDriver } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { HERO_NAMES, HEROES } from '../sprites.ts';
import { isHero } from './heroes.ts';
import { useRoom } from './roomStore.ts';
import { sendInput, setOnlineHandlers } from './session.ts';
import { useRoomSheet } from './sheetStore.ts';

/**
 * Bridges server room events into the shared match presentation (HUD, wipe, banners) and the
 * predicted online driver. Installed once while Chickenz is loaded.
 */
export function installOnline() {
  setOnlineHandlers({
    onRoundStart(e) {
      // The lineup and our slot come with the round: seats are renumbered at match start and the
      // state patch lands after this message (you −1: watching, no local bird).
      const heroes = e.heroes.map((h) => (isHero(h) ? h : HEROES[0]));
      // Bots are always labelled: an invited bot by its hero, a takeover keeps "Bot (Name)".
      const names = e.names.map((n, i) =>
        n === 'Bot' ? `Bot · ${HERO_NAMES[heroes[i] ?? HEROES[0]]}` : n,
      );
      const machine = useGameMachine.getState();
      if (machine.phase === 'attract') machine.send('entering');
      const driver = getDriver();
      if (driver) driver.sendInput = sendInput;
      getDirectors()?.match.onlineRound(
        e.round,
        e.seed,
        e.mapId,
        e.players,
        e.you,
        heroes,
        names,
        e.wins,
      );
    },
    onRoundEnd(e) {
      getDirectors()?.match.onlineRoundEnd(e.winner, e.wins);
    },
    onMatchEnd(e) {
      getDirectors()?.match.onlineMatchEnd(e.winner, e.wins);
    },
    onEmote(e) {
      if (isChickenzEmote(e.emote)) fromRoom(e.slot, e.emote);
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
    // Back in the room lobby after a match: stand down the match HUD and reopen the lobby, so
    // the group stays together (it used to drop players back to the hub; Codex UX #4).
    if (s.phase === 'lobby' && prev.phase !== 'lobby') {
      getDirectors()?.match.stop();
      driver.exhibit();
      useGameMachine.getState().send('leaving');
      useRoomSheet.getState().setOpen(true);
    }
  });
  return () => {
    unsubscribe();
    setOnlineHandlers(null);
  };
}

export const onlineMatchActive = () =>
  useMatch.getState().status !== 'off' && getDirectors()?.match.online === true;
