import { create } from 'zustand';

import {
  CHICKENZ_EMOTES,
  CHICKENZ_MSG,
  type ChickenzEmote,
  EMOTE_COOLDOWN_MS,
} from '@arena/protocol/chickenz';

import { playCue } from '../audio/sfx.ts';
import { getDriver } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { inRoom, sendCommand } from '../net/session.ts';

/** What each quick-chat id says over a bird: short enough to read mid-fight. */
export const EMOTE_TEXT = {
  gg: 'GG',
  nice: 'NICE!',
  oops: 'OOPS',
  haha: 'HAHA',
  comeon: 'COME ON!',
  wow: 'WOW',
} as const satisfies Record<ChickenzEmote, string>;

export type { ChickenzEmote };
export { CHICKENZ_EMOTES as EMOTES };

/** A bubble per slot; `id` restarts the pop when the same emote is said twice. */
type Bubble = { emote: ChickenzEmote; id: number };
type EmoteState = { bubbles: (Bubble | null)[] };

export const useEmotes = create<EmoteState>()(() => ({ bubbles: [null, null, null, null] }));

let nextId = 1;
let lastSaidAt = 0;

/** Show a bubble over a bird (local or from the room). */
export function showEmote(slot: number, emote: ChickenzEmote) {
  const bubbles = [...useEmotes.getState().bubbles];
  if (slot < 0 || slot >= bubbles.length) return;
  bubbles[slot] = { emote, id: nextId++ };
  useEmotes.setState({ bubbles });
  playCue('cz.emote');
}

/** Your slot while you have a bird on the field, else -1 (watchers and the backdrop can't chat). */
function mySlot() {
  const d = getDriver();
  if (!d) return -1;
  if (d.kind === 'tutorial') return 0;
  if (useMatch.getState().status === 'off') return -1;
  return d.humanSlot;
}

/**
 * Say an emote: instantly over your own bird, and to the room when online (the server echoes it
 * to everyone; `fromRoom` ignores the echo of your own).
 */
export function sayEmote(emote: ChickenzEmote) {
  const slot = mySlot();
  const now = performance.now();
  if (slot < 0 || now - lastSaidAt < EMOTE_COOLDOWN_MS) return;
  lastSaidAt = now;
  showEmote(slot, emote);
  if (inRoom()) sendCommand(CHICKENZ_MSG.emote, emote);
}

export function fromRoom(slot: number, emote: ChickenzEmote) {
  if (slot === mySlot()) return;
  showEmote(slot, emote);
}

export const clearEmotes = () => useEmotes.setState({ bubbles: [null, null, null, null] });
