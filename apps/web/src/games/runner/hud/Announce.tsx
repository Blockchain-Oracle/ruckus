import { AnimatePresence, m } from 'motion/react';

import { useRunner } from '../match/store.ts';

/** Arcade call-outs: slam in with a spring, float out. FINISH! and WIPEOUT wear their colour. */
export function Announce() {
  const a = useRunner((s) => s.announce);
  const big = a?.text === 'FINISH!' || a?.text === 'WIPEOUT';
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <AnimatePresence mode="popLayout">
        {a && (
          <m.div
            key={a.key}
            initial={{ scale: 2.4, opacity: 0, rotate: big ? -8 : 0 }}
            animate={{ scale: 1, opacity: 1, rotate: big ? -4 : 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="flex flex-col items-center"
          >
            <div
              className="font-display leading-none"
              style={{
                fontSize: big ? 'clamp(3.5rem, 12vw, 8rem)' : 'clamp(3rem, 10vw, 6.5rem)',
                color: a.tone ?? '#fff1d6',
                WebkitTextStroke: '3px #1b1024',
                textShadow: '0 6px 0 #1b1024, 0 10px 30px rgb(0 0 0 / 0.5)',
              }}
            >
              {a.text}
            </div>
            {a.sub && (
              <div
                className="mt-2 font-display text-3xl text-cream"
                style={{ textShadow: '0 3px 0 #1b1024' }}
              >
                {a.sub}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
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
