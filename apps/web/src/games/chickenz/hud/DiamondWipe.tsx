import { WIPE_COLUMNS, WIPE_GROW_MS, WIPE_ROWS, WIPE_WAVE_MS } from '../match/config.ts';
import { useMatch } from '../match/store.ts';

const WIPE_COLOR = '#111122';
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const CELLS = Array.from({ length: WIPE_COLUMNS * WIPE_ROWS }, (_, i) => i);

/** Chickenz's round transition: a 5×3 grid of diamonds growing column by column, then shrinking. */
export function DiamondWipe() {
  const wipe = useMatch((s) => s.wipe);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-40 grid overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${WIPE_COLUMNS}, 1fr)`,
        gridTemplateRows: `repeat(${WIPE_ROWS}, 1fr)`,
        visibility: wipe === 0 ? 'hidden' : 'visible',
      }}
    >
      {CELLS.map((i) => (
        <div key={i} className="relative overflow-visible">
          <div
            className="absolute top-1/2 left-1/2"
            style={{
              width: '50vmax',
              height: '50vmax',
              background: WIPE_COLOR,
              transform: `translate(-50%, -50%) rotate(45deg) scale(${wipe === 1 ? 1 : 0})`,
              transition:
                wipe === 0
                  ? 'none'
                  : `transform ${WIPE_GROW_MS}ms ${EASE} ${(i % WIPE_COLUMNS) * WIPE_WAVE_MS}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
