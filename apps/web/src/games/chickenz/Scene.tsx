import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';

import type { GameSceneProps } from '@/engine/types.ts';

import { Arena } from './render/Arena.tsx';
import { Bird } from './render/Bird.tsx';
import { Pickups } from './render/Pickups.tsx';
import { Projectiles } from './render/Projectiles.tsx';
import { layoutFrom } from './render/terrain.ts';
import { Zone } from './render/Zone.tsx';
import { ChickenzDriver } from './sim/driver.ts';
import { HEROES } from './sprites.ts';

/** Attract seed: fixed per scene generation, so a revisit shows a fresh exhibition. */
const ATTRACT_SEED_BASE = 0x5eed;

export function ChickenzScene({ generation }: GameSceneProps) {
  const driver = useMemo(() => new ChickenzDriver(ATTRACT_SEED_BASE + generation), [generation]);
  const [round, setRound] = useState(0);
  useEffect(() => {
    driver.start();
    driver.onRound = () => setRound(driver.round);
    return () => driver.stop();
  }, [driver]);

  // Map changes between exhibition rounds; the terrain rebakes only then.
  const layout = useMemo(() => {
    void round;
    return layoutFrom(driver.sim.platforms(), driver.sim.weapon_spawns());
  }, [driver, round]);

  useFrame((_, delta) => driver.update(delta));

  return (
    <>
      <color attach="background" args={['#1b1024']} />
      <Arena seed={ATTRACT_SEED_BASE + generation + round} layout={layout} />
      <Pickups driver={driver} />
      {HEROES.map((hero, slot) => (
        <Bird key={hero} hero={hero} slot={slot} driver={driver} />
      ))}
      <Projectiles driver={driver} />
      <Zone driver={driver} />
    </>
  );
}
