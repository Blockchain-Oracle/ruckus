import { useEffect, useState } from 'react';

/** Re-render at a modest rate for HUD numbers that change every sim tick (HP, clock). */
export function useTick(hz: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}
