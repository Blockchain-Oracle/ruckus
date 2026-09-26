import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  type InstancedMesh,
  Object3D,
} from 'three/webgpu';

import { type Entity, isTaken, PICKUP_IDS, type PickupId, type World } from '@arena/sim-runner';

import { COLORS, laneX, PLATFORM_COLORS, VIEW_AHEAD_M, VIEW_BEHIND_M, zAt } from '../config.ts';
import { PICKUP_LOOK, pickupIcon } from './textures.ts';

const MAX_COINS = 120;
const MAX_PICKUPS = 12;
const MAX_PLATFORMS = 16;
/** DAG Dasher's motion: coins spin 2 rad/s and bob ±0.1 at 4 Hz; pickups spin 1.5, bob ±0.15. */
const COIN_SPIN = 2;
const PICKUP_SPIN = 1.5;
const PLATFORM_W = 2.2;

const dummy = new Object3D();
const tint = new Color();

type Props = { world: () => World; focus: () => number; focusS: () => number };

/** Gold coins, mystery pickups and runway platforms, one instanced draw per part. */
export function Collectibles({ world, focus, focusS }: Props) {
  const coins = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const bubbles = useRef<InstancedMesh>(null);
  const icons = useRef<Partial<Record<PickupId, InstancedMesh | null>>>({});
  const bodies = useRef<InstancedMesh>(null);
  const tops = useRef<InstancedMesh>(null);
  const t = useRef(0);
  const coinGeo = useMemo(() => {
    const g = new CylinderGeometry(0.26, 0.26, 0.06, 28);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const platformGeo = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    // Origin at the near end's bottom: scale z by the platform's length and it runs forward.
    g.translate(0, 0.5, -0.5);
    return g;
  }, []);
  const topGeo = useMemo(() => {
    const g = new BoxGeometry(1, 0.04, 1);
    g.translate(0, 0, -0.5);
    return g;
  }, []);
  const glyphs = useMemo(pickupIcon, []);

  useFrame((_, delta) => {
    t.current += delta;
    const tt = t.current;
    const w = world();
    const s = focusS();
    const me = w.runners[focus()];
    let nc = 0;
    let np = 0;
    let nf = 0;
    const perIcon: Partial<Record<PickupId, number>> = {};
    for (let k = 0; k < w.course.length; k++) {
      const e = w.course[k] as Entity;
      if (e.s < s - VIEW_BEHIND_M) continue;
      if (e.s > s + VIEW_AHEAD_M) break;
      if (e.kind === 'barrier') continue;
      const z = zAt(e.s, s);
      if (e.kind === 'platform') {
        if (nf >= MAX_PLATFORMS) continue;
        dummy.position.set(laneX(e.lane), 0, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(PLATFORM_W, e.y, e.lengthM);
        dummy.updateMatrix();
        bodies.current?.setMatrixAt(nf, dummy.matrix);
        tint.set(PLATFORM_COLORS[e.platform]);
        bodies.current?.setColorAt(nf, tint);
        dummy.position.y = e.y + 0.02;
        dummy.scale.set(PLATFORM_W - 0.1, 1, e.lengthM);
        dummy.updateMatrix();
        tops.current?.setMatrixAt(nf, dummy.matrix);
        tops.current?.setColorAt(nf, tint.multiplyScalar(1.4));
        nf += 1;
        continue;
      }
      if (me && isTaken(me, k)) continue;
      if (e.kind === 'coin') {
        if (nc >= MAX_COINS) continue;
        const bob = Math.sin(tt * Math.PI * 8 + e.s) * 0.1;
        dummy.position.set(laneX(e.lane), e.y + bob, z);
        dummy.rotation.set(0, tt * COIN_SPIN * Math.PI + e.s * 0.3, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        coins.current?.setMatrixAt(nc, dummy.matrix);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.62);
        dummy.updateMatrix();
        halos.current?.setMatrixAt(nc, dummy.matrix);
        nc += 1;
      } else if (np < MAX_PICKUPS) {
        const bob = Math.sin(tt * Math.PI * 8 + e.s) * 0.15;
        const pulse = 1 + Math.sin(tt * Math.PI * 8) * 0.1;
        dummy.position.set(laneX(e.lane), e.y + bob, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.5 * pulse);
        dummy.updateMatrix();
        bubbles.current?.setMatrixAt(np, dummy.matrix);
        bubbles.current?.setColorAt(np, tint.set(PICKUP_LOOK[e.pickup].tone));
        dummy.rotation.set(0, 0, Math.sin(tt * PICKUP_SPIN) * 0.25);
        dummy.scale.setScalar(0.62 * pulse);
        dummy.position.z += 0.05;
        dummy.updateMatrix();
        const n = perIcon[e.pickup] ?? 0;
        icons.current[e.pickup]?.setMatrixAt(n, dummy.matrix);
        perIcon[e.pickup] = n + 1;
        np += 1;
      }
    }
    const finish = (m: InstancedMesh | null | undefined, n: number) => {
      if (!m) return;
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
    finish(coins.current, nc);
    finish(halos.current, nc);
    finish(bubbles.current, np);
    finish(bodies.current, nf);
    finish(tops.current, nf);
    for (const id of PICKUP_IDS) finish(icons.current[id], perIcon[id] ?? 0);
  });

  return (
    <group>
      <instancedMesh ref={coins} args={[coinGeo, undefined, MAX_COINS]} frustumCulled={false}>
        <meshStandardMaterial
          color={COLORS.coin}
          emissive={COLORS.coin}
          emissiveIntensity={0.55}
          metalness={0.9}
          roughness={0.25}
        />
      </instancedMesh>
      <instancedMesh ref={halos} args={[undefined, undefined, MAX_COINS]} frustumCulled={false}>
        <circleGeometry args={[0.5, 20]} />
        <meshBasicMaterial
          color={COLORS.coinRim}
          transparent
          opacity={0.1}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={bubbles} args={[undefined, undefined, MAX_PICKUPS]} frustumCulled={false}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {PICKUP_IDS.map((id) => (
        <instancedMesh
          key={id}
          ref={(m) => {
            icons.current[id] = m;
          }}
          args={[undefined, undefined, MAX_PICKUPS]}
          frustumCulled={false}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glyphs[id]} transparent depthWrite={false} toneMapped={false} />
        </instancedMesh>
      ))}
      <instancedMesh
        ref={bodies}
        args={[platformGeo, undefined, MAX_PLATFORMS]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#2a2850"
          roughness={0.4}
          metalness={0.5}
          transparent
          opacity={0.92}
        />
      </instancedMesh>
      <instancedMesh ref={tops} args={[topGeo, undefined, MAX_PLATFORMS]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
