import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { safeJSONStorage } from './safeStorage.ts';

/** Chickenz guest names: Animal + digits, max 7 chars (`ui/AnimalNameGenerator.ts`). */
const ANIMALS = [
  'Moose',
  'Fox',
  'Cat',
  'Dog',
  'Lion',
  'Zebra',
  'Bear',
  'Wolf',
  'Eagle',
  'Hawk',
  'Otter',
  'Panda',
  'Koala',
  'Raven',
  'Shark',
  'Whale',
  'Tiger',
  'Cobra',
  'Viper',
  'Gecko',
  'Lemur',
  'Bison',
  'Crane',
  'Heron',
  'Finch',
  'Robin',
  'Llama',
  'Goose',
  'Duck',
  'Deer',
  'Frog',
  'Toad',
  'Crab',
  'Crow',
  'Dove',
  'Lynx',
  'Mole',
  'Moth',
  'Wasp',
  'Wren',
  'Swan',
  'Yak',
  'Newt',
  'Puma',
  'Seal',
  'Mink',
] as const;
export const NAME_MAX = 7;
const NAME_PATTERN = /^[A-Za-z0-9_]{1,7}$/;

export function guestName(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)] ?? 'Fox';
  const digits = NAME_MAX - animal.length;
  const n = Math.floor(Math.random() * 10 ** digits);
  return `${animal}${n}`.slice(0, NAME_MAX);
}

export const validName = (name: string) => NAME_PATTERN.test(name);

type Profile = {
  name: string;
  /** False until the player has confirmed a name once ("LET'S GO!"). */
  named: boolean;
  setName(name: string): void;
};

export const useProfile = create<Profile>()(
  persist(
    (set) => ({
      name: guestName(),
      named: false,
      setName: (name) => set({ name, named: true }),
    }),
    { name: 'ruckus.profile', version: 1, storage: safeJSONStorage },
  ),
);
