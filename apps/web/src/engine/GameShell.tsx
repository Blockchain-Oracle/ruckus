import { Canvas, extend, useThree } from '@react-three/fiber';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three/webgpu';

import { getLoadedGame } from '@/games/loader.ts';

import { AdaptiveDpr, dprCeiling } from './AdaptiveDpr.tsx';
import { CameraDirector } from './CameraDirector.tsx';
import { DPR_MIN } from './config.ts';
import { isInteractive, useGameMachine } from './gameMachine.ts';
import { createRenderer } from './renderer.ts';
import { stageWarmed } from './stageWarm.ts';
import { WelcomeScene, welcomeRig } from './WelcomeScene.tsx';

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
          {/* Same boundary as the scene: it mounts only once the scene's assets have loaded. */}
          <StageWarmer key={generation} />
        </Suspense>
        <CameraDirector rig={rig} />
        <AdaptiveDpr />
      </Canvas>
    </div>
  );
}

/**
 * Compiles every shader the new scene uses while the scrim still covers it, then tells the fade
 * it may lift: first-use compiles are the stutter a phone feels when a game appears.
 */
function StageWarmer() {
  const gl = useThree((s) => s.gl) as unknown as {
    compileAsync?: (...a: unknown[]) => Promise<unknown>;
  };
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const compile = gl.compileAsync?.(scene, camera) ?? Promise.resolve();
    void compile.catch(() => {}).finally(stageWarmed);
  }, [gl, scene, camera]);
  return null;
}
