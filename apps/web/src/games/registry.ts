import chickenzJpg from '@/assets/previews/chickenz.jpg?url';
import chickenzMp4 from '@/assets/previews/chickenz.mp4?url';
import chickenzWebm from '@/assets/previews/chickenz.webm?url';
import poolJpg from '@/assets/previews/pool.jpg?url';
import poolMp4 from '@/assets/previews/pool.mp4?url';
import poolWebm from '@/assets/previews/pool.webm?url';
import runnerJpg from '@/assets/previews/runner.jpg?url';
import runnerMp4 from '@/assets/previews/runner.mp4?url';
import runnerWebm from '@/assets/previews/runner.webm?url';
import soccerJpg from '@/assets/previews/soccer.jpg?url';
import soccerMp4 from '@/assets/previews/soccer.mp4?url';
import soccerWebm from '@/assets/previews/soccer.webm?url';
import type { GameModule } from '@/engine/types.ts';

export type GameId = 'chickenz' | 'pool' | 'soccer' | 'runner';

type GameEntry = {
  id: GameId;
  title: string;
  /** i18n key for the one-line pitch on the cabinet tile. */
  taglineKey:
    | 'games.chickenz.tagline'
    | 'games.pool.tagline'
    | 'games.soccer.tagline'
    | 'games.runner.tagline';
  players: string;
  /** Hidden games are never shown as "coming soon" (PLAN §1 decision 7). */
  hidden: boolean;
  /** The game's VRF round, named on its landing card. */
  wager: string;
  /** Recorded attract footage for the landing card (encode-previews): poster, then video. */
  preview: { poster: string; webm: string; mp4: string };
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
    wager: 'Back a Bird',
    preview: { poster: chickenzJpg, webm: chickenzWebm, mp4: chickenzMp4 },
    load: () => import('./chickenz/index.ts').then((m) => m.chickenz),
  },
  {
    id: 'pool',
    title: '8-Ball',
    taglineKey: 'games.pool.tagline',
    players: '1–2',
    hidden: false,
    wager: 'Call Your Shot',
    preview: { poster: poolJpg, webm: poolWebm, mp4: poolMp4 },
    load: () => import('./pool/index.ts').then((m) => m.pool),
  },
  {
    id: 'soccer',
    title: 'Egg Soccer',
    taglineKey: 'games.soccer.tagline',
    players: '1–4',
    hidden: false,
    wager: 'Call the Finish',
    preview: { poster: soccerJpg, webm: soccerWebm, mp4: soccerMp4 },
    load: () => import('./soccer/index.ts').then((m) => m.soccer),
  },
  {
    id: 'runner',
    title: 'Neon Dash',
    taglineKey: 'games.runner.tagline',
    players: '1–4',
    hidden: false,
    wager: 'Call the Wipeout',
    preview: { poster: runnerJpg, webm: runnerWebm, mp4: runnerMp4 },
    load: () => import('./runner/index.ts').then((m) => m.runner),
  },
] as const satisfies readonly GameEntry[];

/** `?preview` shows unshipped games (dev and QA only; nothing links to it). */
const PREVIEW_PARAM = 'preview';

export const visibleGames = () => {
  const preview = new URLSearchParams(window.location.search).has(PREVIEW_PARAM);
  return GAMES.filter((g) => preview || !g.hidden);
};

export const findGame = (id: string | null) => GAMES.find((g) => g.id === id) ?? null;
