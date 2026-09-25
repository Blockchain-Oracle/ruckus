/**
 * Shareable state lives in the query string (`?game=chickenz&room=ABCD`). There's no router: the
 * page is served from any static path (Vercel, the chain.wtf iframe, the :3300 simulator), and the
 * host binds per iframe element, so we only ever replaceState, never navigate.
 */
export type UrlState = { game: string | null; room: string | null };

const KEYS = { game: 'game', room: 'room' } as const;

export function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  return { game: params.get(KEYS.game), room: params.get(KEYS.room) };
}

export function writeUrlState(patch: Partial<UrlState>) {
  const url = new URL(window.location.href);
  for (const [field, key] of Object.entries(KEYS)) {
    if (!(field in patch)) continue;
    const value = patch[field as keyof UrlState];
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href !== window.location.href) window.history.replaceState(null, '', url);
}
