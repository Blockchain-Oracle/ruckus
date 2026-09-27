import { AnimatePresence, m } from 'motion/react';

export type Callout = { key: number | string; text: string; sub?: string | undefined };

/** Big call-outs (GOAL!, FINISH!) get more size and a tilt; the rest just slam in. */
const SIZE = {
  normal: 'clamp(3rem, 10vw, 6.5rem)',
  big: 'clamp(3.5rem, 12vw, 8rem)',
  huge: 'clamp(4rem, 14vw, 9rem)',
} as const;

/** Arcade call-outs, shared by every game: slam in with a spring, float out. */
export function Announce({
  callout,
  size = 'normal',
  tone = '#fff1d6',
}: {
  callout: Callout | null | undefined;
  size?: keyof typeof SIZE;
  tone?: string;
}) {
  const tilt = size !== 'normal';
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <AnimatePresence mode="popLayout">
        {callout && (
          <m.div
            key={callout.key}
            initial={{ scale: 2.4, opacity: 0, rotate: tilt ? -8 : 0 }}
            animate={{ scale: 1, opacity: 1, rotate: tilt ? -4 : 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className="flex flex-col items-center"
          >
            <div
              className="font-display leading-none"
              style={{
                fontSize: SIZE[size],
                color: tone,
                WebkitTextStroke: '3px #1b1024',
                textShadow: '0 6px 0 #1b1024, 0 10px 30px rgb(0 0 0 / 0.5)',
              }}
            >
              {callout.text}
            </div>
            {callout.sub && (
              <div
                className="mt-2 font-display text-3xl text-cream"
                style={{ textShadow: '0 3px 0 #1b1024' }}
              >
                {callout.sub}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
