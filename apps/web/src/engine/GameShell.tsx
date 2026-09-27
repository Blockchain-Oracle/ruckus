import { Canvas, extend, useFrame } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three/webgpu';

import { getLoadedGame } from '@/games/loader.ts';

import { AdaptiveDpr, dprCeiling } from './AdaptiveDpr.tsx';
import { CameraDirector } from './CameraDirector.tsx';
import { DPR_MIN } from './config.ts';
import { isInteractive, useGameMachine } from './gameMachine.ts';
import { createRenderer } from './renderer.ts';
import { WelcomeScene, welcomeRig } from './WelcomeScene.tsx';
import { setLabelCamera } from './worldLabels.ts';

// The webgpu build's classes (node materials, WebGPURenderer-aware objects) back every JSX element.
extend(THREE as unknown as Parameters<typeof extend>[0]);

/**
 * The one canvas. It never unmounts: menus, matches and results all draw over it, and switching
 * games swaps only the scene inside it (behind the scrim).
 */
export default function GameShell({ onReady }: { onReady?: () => void }) {
  const gameId = useGameMachine((s) => s.gameId);
  const phase = useGameMachine((s) => s.phase);
  const generation = useGameMachine((s) => s.generation);
  // select() awaits the chunk before swapping, so by the time gameId changes it is loaded.
  const module = getLoadedGame(gameId);

  const rig = module?.rig ?? welcomeRig;
  const Scene = module?.Scene;

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ pointerEvents: isInteractive(phase) ? 'auto' : 'none', touchAction: 'none' }}
    >
      <Canvas
        gl={createRenderer}
        dpr={[DPR_MIN, dprCeiling()]}
        camera={{ fov: rig.fov, near: 0.1, far: 400, position: [0, 3, 12] }}
        onCreated={() => onReady?.()}
      >
        <Suspense fallback={null}>
          {Scene ? (
            <Scene key={generation} phase={phase} generation={generation} />
          ) : (
            <WelcomeScene />
          )}
        </Suspense>
        <CameraDirector rig={rig} />
        <LabelCamera />
        <AdaptiveDpr />
      </Canvas>
    </div>
  );
}

/** Hands the camera to the DOM name-chip layer (ui/game/WorldLabels) every frame. */
function LabelCamera() {
  useFrame(({ camera }) => setLabelCamera(camera));
  return null;
}
