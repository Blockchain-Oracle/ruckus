import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three/webgpu';

import { PX } from '../config.ts';
import { useTutorial } from '../tutorial/director.ts';
import { LESSONS } from '../tutorial/lessons.ts';

const RING_R = 0.62;
const PULSE_HZ = 2;

/** The lesson's "go here" ring: pulses gold, turns green the moment you reach it. */
export function LessonRing() {
  const g = useRef<Group>(null);
  const t = useRef(0);
  const lesson = useTutorial((s) => s.lesson);
  const passed = useTutorial((s) => s.passed);
  const target = LESSONS[lesson]?.stage.target;
  useFrame((_, delta) => {
    t.current += delta;
    const root = g.current;
    if (!root) return;
    root.scale.setScalar(1 + Math.sin(t.current * PULSE_HZ * Math.PI * 2) * 0.06);
    root.rotation.z += delta * 0.8;
  });
  if (!target) return null;
  const color = passed ? '#7ee081' : '#ffc23a';
  return (
    <group ref={g} position={[target.x * PX, target.y * PX, 0.1]}>
      <mesh>
        <ringGeometry args={[RING_R * 0.82, RING_R, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[RING_R * 0.82, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
