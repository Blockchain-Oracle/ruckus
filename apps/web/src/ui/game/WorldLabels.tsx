import { CaretDownIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import { labelStore, projectLabel } from '@/engine/worldLabels.ts';

/** Your chip pulses for the opening seconds of a match, then just stays bigger. */
const YOU_PULSE_MS = 5000;

/**
 * DOM name chips over 3D characters, crisp at any depth. React re-renders only when a label's
 * text, colour or "you" changes; positions are written straight to the elements every frame.
 */
export function WorldLabels() {
  useSyncExternalStore(labelStore.subscribe, labelStore.version);
  // Chips belong to play: the attract behind the menu keeps its players but shows no names.
  const playing = useGameMachine((s) => s.phase === 'play');
  // Yours renders last, so it sits on top wherever chips overlap.
  const list = labelStore.list().sort(([, a], [, b]) => Number(a.you) - Number(b.you));
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const [pulsing, setPulsing] = useState(false);
  const shown = playing && list.length > 0;

  // A new match (labels appearing from none) restarts the YOU pulse, which then settles.
  useEffect(() => {
    if (!shown) return;
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), YOU_PULSE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = window.innerWidth;
      const h = window.innerHeight;
      for (const [id, el] of nodes.current) {
        const at = projectLabel(id, w, h);
        if (!at) {
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = '1';
        el.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -100%)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[6] overflow-hidden"
      style={{ visibility: playing ? 'visible' : 'hidden' }}
    >
      {list.map(([id, l]) => (
        <div
          key={id}
          ref={(el) => {
            if (el) nodes.current.set(id, el);
            else nodes.current.delete(id);
          }}
          className="absolute top-0 left-0 flex flex-col items-center opacity-0 will-change-transform"
        >
          <span
            className={
              l.you
                ? `rounded-full border-2 border-cream px-2.5 py-0.5 font-display text-sm text-ink shadow-[0_4px_14px_rgb(0_0_0/0.5)] ${pulsing ? 'motion-safe:animate-bounce' : ''}`
                : 'rounded-full px-2 py-0.5 font-display text-[11px] text-ink/90 opacity-90'
            }
            style={{ background: l.color }}
          >
            {l.you ? `YOU · ${l.text}` : l.text}
          </span>
          <CaretDownIcon
            weight="fill"
            className={l.you ? 'size-4 -mt-1' : 'size-3 -mt-1 opacity-80'}
            style={{ color: l.color }}
          />
        </div>
      ))}
    </div>
  );
}
