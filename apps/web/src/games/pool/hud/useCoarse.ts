import { useEffect, useState } from 'react';

const COARSE = '(pointer: coarse)';

/** Touch-first device (drives the touch wording in lessons). */
export function useCoarse() {
  const [coarse, setCoarse] = useState(() => window.matchMedia(COARSE).matches);
  useEffect(() => {
    const mq = window.matchMedia(COARSE);
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}
