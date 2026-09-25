import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';

import { BALL_RADIUS_M, CUE_BALL, canPlaceCue, F, HALF_L, HALF_W, STRIDE } from '@arena/sim-pool';

import { useProfile } from '@/app/stores/profile.ts';
import type { GameSceneProps } from '@/engine/types.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { POOL_TRACK } from './audio/music.ts';
import { playPoolEvents, setPoolBackdrop } from './audio/sfx.ts';
import { SURFACE_Y, simY } from './config.ts';
import { applyHeldKeys, attachPoolKeys } from './input/keys.ts';
import { aim, setAimAngle } from './match/aim.ts';
import { thinkBot } from './match/bot.ts';
import { resetPoolCamera } from './match/camera.ts';
import { PoolDirector } from './match/director.ts';
import { setDirector } from './match/runtime.ts';
import { usePool } from './match/store.ts';
import { tutorialDone } from './match/tutorial.ts';
import { applyPendingRack, poolRooms, relayAim } from './net/online.ts';
import { AimGuide } from './render/AimGuide.tsx';
import { Balls } from './render/Balls.tsx';
import { Cue } from './render/Cue.tsx';
import { PocketMarkers } from './render/PocketMarkers.tsx';
import { Room } from './render/Room.tsx';
import { Table } from './render/Table.tsx';

const ATTRACT_SEED = 0x8ba11;
const R = BALL_RADIUS_M;

export function PoolScene({ phase, generation }: GameSceneProps) {
  const director = useMemo(() => new PoolDirector(ATTRACT_SEED + generation), [generation]);
  const dragging = useRef(false);

  useEffect(() => {
    setDirector(director);
    // Dev-only QA handle; stripped from production builds.
    if (import.meta.env.DEV)
      Object.assign(globalThis, {
        __ruckusPool: director,
        __ruckusPoolKit: { aim, usePool, thinkBot },
      });
    director.startExhibition();
    resetPoolCamera();
    // A room rack that arrived before this scene mounted (invite links) takes over now.
    applyPendingRack();
    return () => setDirector(null);
  }, [director]);

  // Play starts a match against the practice bot; leaving goes back to the exhibition.
  useEffect(() => {
    setPoolBackdrop(phase === 'attract' || phase === 'leaving');
    // In a room the server starts the rack; never start a local practice match meanwhile.
    if (phase === 'entering' && director.mode === 'exhibition' && !poolRooms.inRoom()) {
      director.playerName = useProfile.getState().name;
      // First visit: offer the one-minute lesson before the first rack.
      if (tutorialDone()) director.startMatch(director.playerName);
      else usePool.getState().set({ offerTutorial: true, status: 'playing' });
      resetPoolCamera();
      playMusic(POOL_TRACK);
    } else if (phase === 'leaving' && director.mode !== 'exhibition') {
      director.startExhibition();
      playMusic(LOBBY_TRACK);
    }
  }, [phase, director]);

  useEffect(() => attachPoolKeys(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (director.humanTurn() && director.driver.phase === 'aim') {
      applyHeldKeys(dt);
      if (director.mode === 'online') relayAim(performance.now());
    }
    director.tick(dt);
    const b = director.driver.balls;
    playPoolEvents(director.driver.drain(), (i) => b[i * STRIDE + F.x] ?? 0);
  });

  const driver = () => director.driver;

  // Pointer on the table: aim toward it, or drag the cue ball when it's in hand.
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!director.humanTurn() || director.driver.phase !== 'aim') return;
    const px = e.point.x;
    const py = simY(e.point.z);
    const b = director.driver.balls;
    if (dragging.current) {
      const where = director.driver.rack.ballInHand === 'kitchen' ? 'kitchen' : 'anywhere';
      const x = Math.max(-HALF_L + R, Math.min(HALF_L - R, px));
      const y = Math.max(-HALF_W + R, Math.min(HALF_W - R, py));
      if (canPlaceCue(b, x, y, where)) director.driver.placeCue(x, y);
      return;
    }
    setAimAngle(px - (b[CUE_BALL * STRIDE + F.x] ?? 0), py - (b[CUE_BALL * STRIDE + F.y] ?? 0));
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!director.canPlace()) return;
    const b = director.driver.balls;
    const dx = e.point.x - (b[CUE_BALL * STRIDE + F.x] ?? 0);
    const dy = simY(e.point.z) - (b[CUE_BALL * STRIDE + F.y] ?? 0);
    if (dx * dx + dy * dy < (R * 3) ** 2) {
      dragging.current = true;
      (e.target as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
        e.pointerId,
      );
    }
  };
  const onUp = () => {
    dragging.current = false;
  };

  return (
    <>
      <Room showLamp={phase === 'attract' || phase === 'leaving'} />
      <Table />
      <Balls driver={driver} />
      <Cue driver={driver} show={() => true} />
      <AimGuide driver={driver} show={() => director.humanTurn()} />
      <PocketMarkers />
      <mesh
        position={[0, SURFACE_Y + R, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={onUp}
        visible={false}
      >
        <planeGeometry args={[HALF_L * 2 + 0.6, HALF_W * 2 + 0.6]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}
