import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { type Group, MathUtils, type Mesh, type MeshBasicMaterial } from 'three/webgpu';

import { POWERUP_LIFETIME_S, POWERUP_RADIUS, TICK_HZ } from '@arena/sim-soccer';

import { PX } from '../config.ts';
import type { SoccerDriver } from '../match/driver.ts';
import { POWER_LOOK, powerIcon } from './icons.ts';

const BOB = 0.07;
/** The last second of a bubble's life blinks, so nobody chases one that's about to vanish. */
const BLINK_TICKS = TICK_HZ;
const POP_IN_S = 0.25;

/** The pitch bubble: a glassy orb in its colour code, the effect's glyph floating inside. */
export function PowerUp({ driver }: { driver: () => SoccerDriver }) {
  const g = useRef<Group>(null);
  const shell = useRef<Mesh>(null);
  const icon = useRef<Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const pu = driver().world.powerUp;
    const root = g.current;
    if (!root) return;
    root.visible = Boolean(pu);
    if (!pu) return;
    const age = (POWERUP_LIFETIME_S * TICK_HZ - pu.life) / TICK_HZ;
    const grow = MathUtils.clamp(age / POP_IN_S, 0, 1);
    const s = POWERUP_RADIUS * PX * (1 - (1 - grow) ** 3);
    root.position.set(pu.x * PX, pu.y * PX + Math.sin(t.current * 3) * BOB, 0.05);
    root.scale.setScalar(s);
    root.visible = pu.life > BLINK_TICKS || Math.floor(t.current * 10) % 2 === 0;
    const look = POWER_LOOK[pu.kind];
    const sh = shell.current;
    if (sh) (sh.material as MeshBasicMaterial).color.set(look.tone);
    const ic = icon.current;
    if (ic) {
      const m = ic.material as MeshBasicMaterial;
      const tex = powerIcon(pu.kind);
      if (m.map !== tex) {
        m.map = tex;
        m.needsUpdate = true;
      }
      ic.rotation.z = Math.sin(t.current * 2) * 0.15;
    }
  });

  return (
    <group ref={g} visible={false}>
      <mesh ref={shell}>
        <sphereGeometry args={[1, 28, 18]} />
        <meshBasicMaterial transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh scale={1.06}>
        <ringGeometry args={[0.92, 1, 40]} />
        <meshBasicMaterial color="#fff8e6" transparent opacity={0.9} />
      </mesh>
      <mesh position={[-0.38, 0.4, 0.5]}>
        <circleGeometry args={[0.16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
      </mesh>
      <mesh ref={icon} position={[0, 0, 0.3]} scale={1.3}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent alphaTest={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}
