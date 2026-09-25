import type { Track } from '@/lib/audio/music.ts';

import stadiumM4a from '../assets/music/stadium.m4a?url';
import stadiumWebm from '../assets/music/stadium.webm?url';

/** Arcade stadium anthem under a match (ElevenLabs Music, prompt in assets-src/soccer/music). */
export const STADIUM_TRACK: Track = { id: 'soccer-stadium', urls: [stadiumWebm, stadiumM4a] };
