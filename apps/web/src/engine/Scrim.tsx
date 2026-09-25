import { SCRIM_COLOR, SCRIM_HALF_MS } from './config.ts';
import { useScrim } from './scrim.ts';

const EASE_IN_OUT_CUBIC = 'cubic-bezier(0.65, 0, 0.35, 1)';

export function Scrim() {
  const opaque = useScrim((s) => s.opaque);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        background: SCRIM_COLOR,
        opacity: opaque ? 1 : 0,
        transition: `opacity ${SCRIM_HALF_MS}ms ${EASE_IN_OUT_CUBIC}`,
      }}
    />
  );
}
