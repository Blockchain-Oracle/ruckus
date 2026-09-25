import { useMemo } from 'react';

import { GUN_ART } from './guns.ts';
import { pixelTexture } from './pixelArt.ts';

let cache: ReturnType<typeof pixelTexture>[] | null = null;

/** Gun textures are generated once and shared by every bird and pedestal. */
export function useGunTextures() {
  return useMemo(() => {
    cache ??= GUN_ART.map(pixelTexture);
    return cache;
  }, []);
}
