import type { CasinoGameManifestV1 } from '@chain/casino-sdk';

import manifestJson from '../../../public/game.manifest.json';

/** The same manifest the host fetches from /game.manifest.json, reused for DemoHost snapshots. */
export const GAME_MANIFEST = manifestJson as CasinoGameManifestV1;
