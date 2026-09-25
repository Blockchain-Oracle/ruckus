import { useMemo } from 'react';

import type { GameSceneProps } from '@/engine/types.ts';

import { Arena } from './render/Arena.tsx';
import { attractPose } from './render/attract.ts';
import { Bird } from './render/Bird.tsx';
import { HEROES } from './sprites.ts';

export function ChickenzScene({ generation }: GameSceneProps) {
  const poses = useMemo(() => HEROES.map((_, slot) => attractPose(slot)), []);
  return (
    <>
      <color attach="background" args={['#1b1024']} />
      <Arena seed={generation} />
      {HEROES.map((hero, slot) => (
        <Bird key={hero} hero={hero} pose={poses[slot] ?? attractPose(0)} />
      ))}
    </>
  );
}
