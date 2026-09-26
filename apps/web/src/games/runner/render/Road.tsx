import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, type InstancedMesh, type Mesh, Object3D } from 'three/webgpu';

import { COURSE_M, LANE_WIDTH_M, LANES } from '@arena/sim-runner';

import { COLORS, VIEW_AHEAD_M, VIEW_BEHIND_M, zAt } from '../config.ts';
import { finishTexture, roadTexture } from './textures.ts';

const ROAD_HALF_W = (LANES * LANE_WIDTH_M) / 2 + 0.35;
const ROAD_LEN = VIEW_AHEAD_M + VIEW_BEHIND_M + 40;
/** Road texture tile: 2 m of grid per repeat (DAG Dasher's grid spacing). */
const TILE_M = 2;
/** Edge lights: one every 3 m each side, alternating teal and purple, pulsing (KK). */
const LIGHT_EVERY_M = 3;
const LIGHTS = Math.ceil(ROAD_LEN / LIGHT_EVERY_M) + 2;
const DIVIDER_X = LANE_WIDTH_M / 2;

const dummy = new Object3D();
const tint = new Color();
const TEAL = new Color(COLORS.laneLeft);
const PURPLE = new Color(COLORS.laneRight);

/** The neon road: grid asphalt, glowing lane dividers, edge rails and pulsing edge lights. */
export function Road({ focusS }: { focusS: () => number }) {
  const road = useRef<Mesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const finish = useRef<Mesh>(null);
  const t = useRef(0);
  const tex = useMemo(() => {
    const r = roadTexture().clone();
    r.repeat.set((ROAD_HALF_W * 2) / TILE_M, ROAD_LEN / TILE_M);
    r.needsUpdate = true;
    return r;
  }, []);
  const centreZ = (VIEW_BEHIND_M - VIEW_AHEAD_M) / 2;

  useFrame((_, delta) => {
    t.current += delta;
    const s = focusS();
    // The world streams toward +z as you run; the grid slides with it.
    tex.offset.y = (s / TILE_M) % 1;
    const l = lights.current;
    if (l) {
      const first = Math.floor((s - VIEW_BEHIND_M) / LIGHT_EVERY_M);
      let n = 0;
      for (let k = 0; k < LIGHTS; k++) {
        const idx = first + k;
        const z = zAt(idx * LIGHT_EVERY_M, s);
        const pulse = 0.55 + 0.45 * Math.sin(t.current * 2 + idx * 0.5);
        for (const side of [-1, 1] as const) {
          dummy.position.set(side * (ROAD_HALF_W + 0.12), 0.1, z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          l.setMatrixAt(n, dummy.matrix);
          tint.copy((idx + (side > 0 ? 1 : 0)) % 2 ? PURPLE : TEAL).multiplyScalar(pulse * 1.6);
          l.setColorAt(n, tint);
          n += 1;
        }
      }
      l.count = n;
      l.instanceMatrix.needsUpdate = true;
      if (l.instanceColor) l.instanceColor.needsUpdate = true;
    }
    const f = finish.current;
    if (f) {
      const z = zAt(COURSE_M, s);
      f.visible = z > -VIEW_AHEAD_M && z < VIEW_BEHIND_M;
      f.position.z = z;
    }
  });

  return (
    <group>
      <mesh ref={road} rotation-x={-Math.PI / 2} position={[0, 0, centreZ]} receiveShadow>
        <planeGeometry args={[ROAD_HALF_W * 2, ROAD_LEN]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive="#ffffff"
          emissiveIntensity={0.9}
          roughness={0.5}
          metalness={0.25}
          color="#8a8fb8"
        />
      </mesh>
      {/* Verge: the dark ground out to the towers, with a faint reflection of the city. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, centreZ]}>
        <planeGeometry args={[140, ROAD_LEN]} />
        <meshStandardMaterial color="#07060f" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Lane dividers (teal left, purple right) with a soft additive halo for the glow. */}
      {[
        [-DIVIDER_X, COLORS.laneLeft],
        [DIVIDER_X, COLORS.laneRight],
      ].map(([x, c]) => (
        <group key={String(x)} position={[Number(x), 0.012, centreZ]} rotation-x={-Math.PI / 2}>
          <mesh>
            <planeGeometry args={[0.06, ROAD_LEN]} />
            <meshBasicMaterial color={String(c)} toneMapped={false} />
          </mesh>
          <mesh position-z={0.001}>
            <planeGeometry args={[0.5, ROAD_LEN]} />
            <meshBasicMaterial
              color={String(c)}
              transparent
              opacity={0.16}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {/* Edge rails. */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (ROAD_HALF_W + 0.12), 0.05, centreZ]}>
          <boxGeometry args={[0.12, 0.1, ROAD_LEN]} />
          <meshStandardMaterial
            color="#1a1a33"
            emissive={side < 0 ? COLORS.laneLeft : COLORS.laneRight}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      <instancedMesh ref={lights} args={[undefined, undefined, LIGHTS * 2]} frustumCulled={false}>
        <boxGeometry args={[0.16, 0.22, 0.5]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* The finish: a chequered strip across the road under a glowing gantry. */}
      <group ref={finish} visible={false}>
        <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
          <planeGeometry args={[ROAD_HALF_W * 2, 1.2]} />
          <meshBasicMaterial map={finishTexture()} toneMapped={false} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (ROAD_HALF_W + 0.4), 2.6, 0]}>
            <boxGeometry args={[0.35, 5.2, 0.35]} />
            <meshStandardMaterial color="#15142b" emissive="#ffc23a" emissiveIntensity={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 5.1, 0]}>
          <boxGeometry args={[ROAD_HALF_W * 2 + 1.2, 0.9, 0.25]} />
          <meshBasicMaterial map={finishTexture()} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
