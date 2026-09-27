import { m } from 'motion/react';

import { Announce as SharedAnnounce } from '@/ui/game/Announce.tsx';

import { useRunner } from '../match/store.ts';

/** FINISH! and WIPEOUT wear their colour and a bigger slam. */
export function Announce() {
  const a = useRunner((s) => s.announce);
  const big = a?.text === 'FINISH!' || a?.text === 'WIPEOUT';
  return <SharedAnnounce callout={a} size={big ? 'big' : 'normal'} tone={a?.tone ?? '#fff1d6'} />;
}

/** A screen-edge flash: red when you get hit, green when the shield saves you. */
export function Flash() {
  const f = useRunner((s) => s.flash);
  if (!f) return null;
  const tone = f.kind === 'hit' ? '255 34 68' : '94 224 106';
  return (
    <m.div
      key={f.key}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0"
      style={{ boxShadow: `inset 0 0 120px 30px rgb(${tone} / 0.75)` }}
    />
  );
}
