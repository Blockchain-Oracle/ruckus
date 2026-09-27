import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Fog } from 'three/webgpu';

import type { SimEvent } from '@arena/sim-runner';

import { useSettings } from '@/app/stores/settings.ts';
import { StadiumRig } from '@/engine/look/StadiumRig.tsx';
import type { GameSceneProps } from '@/engine/types.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { keepWindBed, playRunnerEvents, setWindBed } from './audio/sfx.ts';
import { FOG_M, LOOK } from './config.ts';
import { controlsSeen } from './hud/controlsSeen.ts';
import { attachKeys, readInput } from './input/keys.ts';
import { RunnerDriver } from './match/driver.ts';
import {
  consumeChallenge,
  consumeLessonsNext,
  presenter,
  startChallenge,
  startLessons,
  startRace,
  stopRace,
} from './match/flow.ts';
import { focusView, setDriver } from './match/runtime.ts';
import { useRunner } from './match/store.ts';
import { applyPendingRace, runnerRooms } from './net/online.ts';
import { Barriers } from './render/Barriers.tsx';
import { City } from './render/City.tsx';
import { Collectibles } from './render/Collectibles.tsx';
import { RunnerFx } from './render/fx.ts';
import { Road } from './render/Road.tsx';
import { Runners } from './render/Runners.tsx';
import { Sparks } from './render/Sparks.tsx';
import { SpeedLines } from './render/SpeedLines.tsx';
import { tutorial, useTutorial } from './tutorial/director.ts';
import { closeCallTheWipeout } from './wager/controller.ts';
import { useWipeoutBet } from './wager/store.ts';

const ATTRACT_SEED = 0xda5;
/** The Fog debuff pulls the rig's fog (FOG_M) in to 5 → 35 m. */
const FOGGED_M = { near: 5, far: 35 } as const;
const FOG_RATE = 3;

/**
 * Advances the race before anything draws: it is the scene's first child, and R3F runs frame
 * callbacks in subscription order, so every system below reads this frame's positions.
 */
function Tick({ onFrame }: { onFrame: (dt: number) => void }) {
  useFrame((_, delta) => onFrame(Math.min(delta, 0.1)));
  return null;
}

export function RunnerScene({ phase, generation }: GameSceneProps) {
  const driver = useMemo(() => new RunnerDriver(ATTRACT_SEED + generation), [generation]);
  const fx = useMemo(() => new RunnerFx(), []);
  const events = useRef<readonly SimEvent[]>([]);
  const clock = useRef(0);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    setDriver(driver);
    driver.readInput = readInput;
    if (import.meta.env.DEV)
      Object.assign(globalThis, { __ruckusRunner: driver, __ruckusRunnerTutorial: useTutorial });
    const detach = attachKeys();
    // A room race that arrived before this scene mounted (invite links) takes over now.
    applyPendingRace();
    return () => {
      detach();
      setDriver(null);
    };
  }, [driver]);

  // Play starts a practice race (first visit: How to play first); leaving goes back to the bots'
  // exhibition under the hub menu.
  useEffect(() => {
    if (phase === 'attract') setWindBed('backdrop');
    // In a room the server starts the race, and a wager has its own gauntlet: no practice then.
    const betting = useWipeoutBet.getState().phase !== 'off';
    if (
      phase === 'entering' &&
      useRunner.getState().status === 'off' &&
      !runnerRooms.inRoom() &&
      !betting
    ) {
      fx.clear();
      const challenge = consumeChallenge();
      if (challenge) startChallenge(challenge);
      else if (consumeLessonsNext()) startLessons();
      else if (controlsSeen()) startRace();
      else useRunner.getState().set({ status: 'intro' });
    } else if (phase === 'leaving') {
      if (betting) closeCallTheWipeout();
      stopRace();
      fx.clear();
      setWindBed('backdrop');
      playMusic(LOBBY_TRACK);
    }
  }, [phase, fx]);
  useEffect(() => () => setWindBed('off'), []);

  const onFrame = (dt: number) => {
    clock.current += dt;
    driver.update(dt);
    const evs = driver.drain();
    events.current = evs;
    const focus = driver.focus;
    const w = driver.world;
    const racing = driver.mode.kind !== 'exhibition';
    if (driver.mode.kind === 'tutorial') tutorial.update(w, evs, dt);
    fx.ingest(evs, w, focus, () => focusView.x);
    playRunnerEvents(evs, focus, clock.current);
    presenter.update(w, evs, driver.humanSlot, dt, racing);
    keepWindBed();
    // Shake rides the camera pose (read in the same frame).
    fx.trauma.scale = reducedMotion ? 0.2 : 1;
    const shake = fx.trauma.update(dt, { x: 0, y: 0, angle: 0 });
    focusView.shakeX = shake.x;
    focusView.shakeY = shake.y;
    // The Fog debuff closes the night in around you.
    const fog = scene.fog as Fog | null;
    if (fog) {
      const to = w.runners[focus]?.power === 'fog' ? FOGGED_M : FOG_M;
      const k = 1 - Math.exp(-FOG_RATE * dt);
      fog.near += (to.near - fog.near) * k;
      fog.far += (to.far - fog.far) * k;
    }
  };

  const world = () => driver.world;
  const focus = () => driver.focus;
  const focusS = () => driver.focusS();
  return (
    <group>
      <Tick onFrame={onFrame} />
      <StadiumRig look={LOOK} />
      <City focusS={focusS} />
      <Road focusS={focusS} finishM={() => driver.world.finishM} />
      <Barriers world={world} focus={focus} focusS={focusS} />
      <Collectibles world={world} focus={focus} focusS={focusS} />
      <Runners driver={() => driver} events={() => events.current} />
      <Sparks fx={fx} focusS={focusS} />
      <SpeedLines driver={() => driver} />
    </group>
  );
}
