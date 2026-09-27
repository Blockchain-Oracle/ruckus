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
import {
  consumeLessonsNext,
  presenter,
  startLessons,
  startMatch,
  stopMatch,
} from './match/flow.ts';
import { setDriver } from './match/runtime.ts';
import { useSoccer } from './match/store.ts';
import { applyPendingMatch, soccerRooms } from './net/online.ts';
import { Ball, Shadows } from './render/Ball.tsx';
import { Egg } from './render/Egg.tsx';
import { SoccerFx } from './render/fx.ts';
import { Goal } from './render/Goal.tsx';
import { LessonRing } from './render/LessonRing.tsx';
import { Particles } from './render/Particles.tsx';
import { PowerUp } from './render/PowerUp.tsx';
import { Stadium } from './render/Stadium.tsx';
import { tutorial, useTutorial } from './tutorial/director.ts';
import { closeCallTheFinish } from './wager/controller.ts';
import { useFinishBet } from './wager/store.ts';

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
    if (import.meta.env.DEV)
      Object.assign(globalThis, { __ruckusSoccer: driver, __ruckusSoccerTutorial: useTutorial });
    const detach = attachKeys();
    // A room match that arrived before this scene mounted (invite links) takes over now.
    applyPendingMatch();
    return () => {
      detach();
      setDriver(null);
    };
  }, [driver]);

  // Play starts a practice match (first visit: the controls card first); leaving goes back to the
  // bots' exhibition under the hub menu.
  useEffect(() => {
    if (phase === 'attract') setCrowdBed('backdrop');
    // In a room the server starts the match; never start local practice meanwhile.
    const betting = useFinishBet.getState().phase !== 'off';
    if (
      phase === 'entering' &&
      useSoccer.getState().status === 'off' &&
      !soccerRooms.inRoom() &&
      !betting
    ) {
      fx.clear();
      if (consumeLessonsNext()) startLessons();
      else if (controlsSeen()) startMatch();
      else useSoccer.getState().set({ status: 'intro' });
    } else if (phase === 'leaving') {
      if (betting) closeCallTheFinish();
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
    if (driver.mode.kind === 'tutorial') tutorial.update(driver.world, events, dt);
    fx.ingest(events, driver.world);
    playSoccerEvents(events, driver.world);
    presenter.update(
      driver.world,
      dt,
      driver.mode.kind === 'match' ||
        driver.mode.kind === 'online' ||
        // A wager's lineup waits silently behind the call sheet; call-outs start with its match.
        (driver.mode.kind === 'wager' && useFinishBet.getState().phase === 'match'),
    );
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
  // Sides come from the sim (re-read whenever a match starts): line-ups needn't alternate.
  const teams = driver.world.players.map((p) => p.team);
  const lineup = teams.join('');
  return (
    <group ref={stage}>
      <Stadium fx={fx} />
      <Goal side={1} fx={fx} />
      <Goal side={-1} fx={fx} />
      <Shadows driver={get} />
      {Array.from({ length: MAX_SEATS }, (_, slot) => (
        // Seats are fixed identities (slot = sim index); unused ones hide themselves.
        <Egg
          key={`${generation}:${lineup}:${slot}`}
          slot={slot}
          driver={get}
          you={slot === you}
          team={teams[slot] ?? ((slot % 2) as 0 | 1)}
          partner={teams.slice(0, slot).includes(teams[slot] ?? ((slot % 2) as 0 | 1))}
        />
      ))}
      <Ball driver={get} />
      <PowerUp driver={get} />
      <LessonRing />
      <Particles fx={fx} />
    </group>
  );
}
