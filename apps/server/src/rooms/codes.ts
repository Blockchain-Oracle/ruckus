import type { Room } from 'colyseus';

type Presence = Room['presence'];

/** Room codes are Colyseus room ids, unique across every game (one shared presence set). */
const CODE_CHANNEL = '$chickenz-codes';
/** 5-letter join codes without look-alikes (no I, O). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;

export async function uniqueCode(presence: Presence): Promise<string> {
  const taken = await presence.smembers(CODE_CHANNEL);
  let code: string;
  do {
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  } while (taken.includes(code));
  await presence.sadd(CODE_CHANNEL, code);
  return code;
}

export const releaseCode = (presence: Presence, code: string) => presence.srem(CODE_CHANNEL, code);

/** Close codes a client can act on (Colyseus passes them through to the join error). */
export const PROTOCOL_MISMATCH = 4000;
export const ROOM_FULL = 4001;
