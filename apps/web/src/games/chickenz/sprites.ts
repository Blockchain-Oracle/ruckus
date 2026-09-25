import { NearestFilter, SRGBColorSpace, type Texture, TextureLoader } from 'three/webgpu';

import bgBlue from './assets/bg-blue.png';
import bgBrown from './assets/bg-brown.png';
import bgGray from './assets/bg-gray.png';
import bgGreen from './assets/bg-green.png';
import bgPink from './assets/bg-pink.png';
import bgPurple from './assets/bg-purple.png';
import bgYellow from './assets/bg-yellow.png';
import terrainUrl from './assets/terrain.png';

/** Pixel Adventure 1 by Pixel Frog (CC0). Four heroes, one per FFA slot. */
export const HEROES = ['ninja-frog', 'mask-dude', 'pink-man', 'virtual-guy'] as const;
export type Hero = (typeof HEROES)[number];

export const ANIMS = {
  idle: 11,
  run: 12,
  jump: 1,
  'double-jump': 6,
  fall: 1,
  hit: 7,
  'wall-jump': 5,
} as const;
export type Anim = keyof typeof ANIMS;

const characterUrls = import.meta.glob<string>('./assets/characters/*.png', {
  eager: true,
  import: 'default',
});
const characterUrl = (hero: Hero, anim: Anim) => {
  const url = characterUrls[`./assets/characters/${hero}-${anim}.png`];
  if (!url) throw new Error(`Missing sprite ${hero}-${anim}`);
  return url;
};

export const BACKGROUNDS = [bgBlue, bgBrown, bgGray, bgGreen, bgPink, bgPurple, bgYellow] as const;

export type Sprites = {
  terrain: HTMLImageElement;
  backgrounds: Texture[];
  characters: Record<Hero, Record<Anim, Texture>>;
};

const pixelated = (t: Texture) => {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = SRGBColorSpace;
  return t;
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });

let sprites: Sprites | null = null;

/** Everything is tiny (~160 KB), so it all loads before the scrim lifts; no pop-in. */
export async function loadSprites(): Promise<Sprites> {
  if (sprites) return sprites;
  const loader = new TextureLoader();
  const [terrain, backgrounds, characterEntries] = await Promise.all([
    loadImage(terrainUrl),
    Promise.all(BACKGROUNDS.map(async (url) => pixelated(await loader.loadAsync(url)))),
    Promise.all(
      HEROES.map(async (hero) => {
        const anims = await Promise.all(
          (Object.keys(ANIMS) as Anim[]).map(
            async (anim) =>
              [anim, pixelated(await loader.loadAsync(characterUrl(hero, anim)))] as const,
          ),
        );
        return [hero, Object.fromEntries(anims) as Record<Anim, Texture>] as const;
      }),
    ),
  ]);
  sprites = {
    terrain,
    backgrounds,
    characters: Object.fromEntries(characterEntries) as Sprites['characters'],
  };
  return sprites;
}

export function getSprites(): Sprites {
  if (!sprites) throw new Error('Chickenz sprites used before loadSprites()');
  return sprites;
}
