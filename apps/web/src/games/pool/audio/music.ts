import type { Track } from '@/lib/audio/music.ts';

import hallM4a from '../assets/music/hall.m4a?url';
import hallWebm from '../assets/music/hall.webm?url';

/** Late-night pool-hall jazz under the table (ElevenLabs Music, prompt in assets-src/pool/music). */
export const POOL_TRACK: Track = { id: 'pool-hall', urls: [hallWebm, hallM4a] };
