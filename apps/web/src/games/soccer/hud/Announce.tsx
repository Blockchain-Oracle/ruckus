import { Announce as SharedAnnounce } from '@/ui/game/Announce.tsx';

import { KITS } from '../config.ts';
import { useSoccer } from '../match/store.ts';

/** GOAL! wears the scorer's colour and the biggest slam. */
export function Announce() {
  const a = useSoccer((s) => s.announce);
  const goal = a?.text === 'GOAL!';
  const tone = a?.team !== undefined ? KITS[a.team].body : '#ffc23a';
  return (
    <SharedAnnounce callout={a} size={goal ? 'huge' : 'normal'} tone={goal ? tone : '#fff1d6'} />
  );
}
