import { AnimatePresence, m } from 'motion/react';

import { KITS } from '../config.ts';
import { useSoccer } from '../match/store.ts';

/** Arcade call-outs: slam in with a spring, float out. GOAL! wears the scorer's colour. */
export function Announce() {
  const a = useSoccer((s) => s.announce);
  const goal = a?.text === 'GOAL!';
  const tone = a?.team !== undefined ? KITS[a.team].body : '#ffc23a';
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <AnimatePresence mode="popLayout">
        {a && (
          <m.div
            key={a.key}
            initial={{ scale: 2.4, opacity: 0, rotate: goal ? -8 : 0 }}
            animate={{ scale: 1, opacity: 1, rotate: goal ? -4 : 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="flex flex-col items-center"
          >
            <div
              className="font-display leading-none"
              style={{
                fontSize: goal ? 'clamp(4rem, 14vw, 9rem)' : 'clamp(3rem, 10vw, 6.5rem)',
                color: goal ? tone : '#fff1d6',
                WebkitTextStroke: '3px #1b1024',
                textShadow: `0 6px 0 #1b1024, 0 10px 30px rgb(0 0 0 / 0.5)`,
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
