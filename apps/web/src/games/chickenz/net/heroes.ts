import { HEROES, type Hero } from '../sprites.ts';

export const isHero = (h: string): h is Hero => (HEROES as readonly string[]).includes(h);
