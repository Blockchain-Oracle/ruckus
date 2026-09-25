import { DeviceMobileIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { Button } from '@/ui/Button.tsx';

const PORTRAIT = '(orientation: portrait)';

function usePortrait() {
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT).matches);
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}

/**
 * Chickenz is a sideways game (a height-locked 16:9 arena): upright phones see a sliver of it.
 * Ask once per visit to turn the phone; "Play anyway" keeps the follow camera for the stubborn.
 */
export function RotateHint() {
  const portrait = usePortrait();
  const [dismissed, setDismissed] = useState(false);
  if (!portrait || dismissed) return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-ink px-6 font-pixel">
      <div className="flex max-w-xs flex-col items-center gap-5 text-center">
        <DeviceMobileIcon
          weight="bold"
          aria-hidden
          className="size-16 animate-[rotate-hint_2.4s_ease-in-out_infinite] text-cream"
        />
        <div
          className="text-xl uppercase text-[#ffee58]"
          style={{ textShadow: '2px 2px 0 #c9a800' }}
        >
          Turn your phone sideways
        </div>
        <p className="text-sm text-cream-dim">The arena is wide. Landscape shows all of it.</p>
        <Button size="sm" sound="ui.click" onClick={() => setDismissed(true)}>
          Play anyway
        </Button>
      </div>
    </div>
  );
}
