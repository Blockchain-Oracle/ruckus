import type { GameModule } from '@/engine/types.ts';

export type GameId = 'chickenz';

type GameEntry = {
  id: GameId;
  title: string;
  /** i18n key for the one-line pitch on the cabinet tile. */
  taglineKey: 'games.chickenz.tagline';
  players: string;
  /** Hidden games are never shown as "coming soon" (PLAN §1 decision 7). */
  hidden: boolean;
  load: () => Promise<GameModule>;
};

/** Metadata is eager (the hub renders tiles instantly); game code is one lazy chunk per game. */
export const GAMES = [
  {
    id: 'chickenz',
    title: 'Chickenz',
    taglineKey: 'games.chickenz.tagline',
    players: '2–4',
    hidden: false,
    load: () => import('./chickenz/index.ts').then((m) => m.chickenz),
  },
] as const satisfies readonly GameEntry[];

/** `?preview` shows unshipped games (dev and QA only; nothing links to it). */
const PREVIEW_PARAM = 'preview';

export const visibleGames = () => {
  const preview = new URLSearchParams(window.location.search).has(PREVIEW_PARAM);
  return GAMES.filter((g) => preview || !g.hidden);
};

export const findGame = (id: string | null) => GAMES.find((g) => g.id === id) ?? null;
