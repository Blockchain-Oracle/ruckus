import { cn } from '@/lib/utils.ts';

import { characterUrl, type Hero } from '../sprites.ts';

const IDLE_FRAMES = 11;

/** First idle frame of the sprite strip, scaled up with crisp pixels. */
export function HeroPortrait({ hero, className }: { hero: Hero; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block aspect-square [image-rendering:pixelated]', className)}
      style={{
        backgroundImage: `url(${characterUrl(hero, 'idle')})`,
        backgroundSize: `${IDLE_FRAMES * 100}% 100%`,
        backgroundPosition: '0 0',
      }}
    />
  );
}
