import type { Track } from '@/lib/audio/music.ts';

import battleAM4a from '../assets/music/battle-a.m4a?url';
import battleAWebm from '../assets/music/battle-a.webm?url';
import battleBM4a from '../assets/music/battle-b.m4a?url';
import battleBWebm from '../assets/music/battle-b.webm?url';

/** Two battle themes, alternated per match so a long session doesn't loop one tune. */
export const BATTLE_TRACKS: readonly Track[] = [
  { id: 'chickenz-battle-a', urls: [battleAWebm, battleAM4a] },
  { id: 'chickenz-battle-b', urls: [battleBWebm, battleBM4a] },
];
