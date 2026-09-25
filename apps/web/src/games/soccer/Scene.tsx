import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three/webgpu';

import { useSettings } from '@/app/stores/settings.ts';
import type { GameSceneProps } from '@/engine/types.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { keepCrowdBed, playSoccerEvents, setCrowdBed } from './audio/sfx.ts';
import { controlsSeen } from './hud/controlsSeen.ts';
import { attachKeys, readInput } from './input/keys.ts';
import { SoccerDriver } from './match/driver.ts';
import { presenter, startMatch, stopMatch } from './match/flow.ts';
import { setDriver } from './match/runtime.ts';
import { useSoccer } from './match/store.ts';
import { Ball, Shadows } from './render/Ball.tsx';
import { Egg } from './render/Egg.tsx';
import { SoccerFx } from './render/fx.ts';
import { Goal } from './render/Goal.tsx';
import { Particles } from './render/Particles.tsx';
import { PowerUp } from './render/PowerUp.tsx';
import { Stadium } from './render/Stadium.tsx';

const ATTRACT_SEED = 0xe99;
const MAX_SEATS = 4;

export function SoccerScene({ phase, generation }: GameSceneProps) {
  const driver = useMemo(() => new SoccerDriver(ATTRACT_SEED + generation), [generation]);
  const fx = useMemo(() => new SoccerFx(), []);
  const stage = useRef<Group>(null);
  const shake = useRef({ x: 0, y: 0, angle: 0 });
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const status = useSoccer((s) => s.status);

  useEffect(() => {
    setDriver(driver);
    driver.readInput = readInput;
    if (import.meta.env.DEV) Object.assign(globalThis, { __ruckusSoccer: driver });
    const detach = attachKeys();
    return () => {
      detach();
      setDriver(null);
    };
  }, [driver]);

  // Play starts a practice match (first visit: the controls card first); leaving goes back to the
  // bots' exhibition under the hub menu.
  useEffect(() => {
    if (phase === 'attract') setCrowdBed('backdrop');
    if (phase === 'entering' && useSoccer.getState().status === 'off') {
      fx.clear();
      if (controlsSeen()) startMatch();
      else useSoccer.getState().set({ status: 'intro' });
    } else if (phase === 'leaving') {
      stopMatch();
      fx.clear();
      setCrowdBed('backdrop');
      playMusic(LOBBY_TRACK);
    }
  }, [phase, fx]);
  useEffect(() => () => setCrowdBed('off'), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    driver.update(dt);
    const events = driver.drain();
    fx.ingest(events, driver.world);
    playSoccerEvents(events, driver.world);
    presenter.update(driver.world, dt, driver.mode.kind === 'match');
    keepCrowdBed();
    const g = stage.current;
    if (g) {
      fx.trauma.scale = reducedMotion ? 0.2 : 1;
      const s = fx.trauma.update(dt, shake.current);
      g.position.set(s.x, s.y, 0);
      g.rotation.z = s.angle;
    }
  });

  const get = () => driver;
  const you = status !== 'off' ? driver.humanSlot : -1;
  return (
    <group ref={stage}>
      <Stadium fx={fx} />
      <Goal side={1} fx={fx} />
      <Goal side={-1} fx={fx} />
      <Shadows driver={get} />
      {Array.from({ length: MAX_SEATS }, (_, slot) => (
        // Seats are fixed identities (slot = sim index); unused ones hide themselves.
        <Egg key={`${generation}:${slot}`} slot={slot} driver={get} you={slot === you} />
      ))}
      <Ball driver={get} />
      <PowerUp driver={get} />
      <Particles fx={fx} />
    </group>
  );
}
