/** Registered Colyseus room names — the single source for server `defineServer` and client joins. */
export const ROOM = {
  hello: 'hello',
  chickenz: 'chickenz',
} as const;
export type RoomName = (typeof ROOM)[keyof typeof ROOM];
