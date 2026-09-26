import type { Track } from '@/lib/audio/music.ts';

import chaseM4a from '../assets/music/chase.m4a?url';
import chaseWebm from '../assets/music/chase.webm?url';

/** Neon synthwave chase under a race (ElevenLabs Music, prompt in assets-src/runner/music). */
export const CHASE_TRACK: Track = { id: 'runner-chase', urls: [chaseWebm, chaseM4a] };
