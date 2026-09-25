import { POCKETS } from '@arena/sim-pool';

import { CORNER_POCKET_OUT, RAIL_TOP, SIDE_POCKET_OUT, SURFACE_Y, worldZ } from '../config.ts';
import { usePool } from '../match/store.ts';

/** On the 8: glowing rings over each pocket; tap one to call it. */
export function PocketMarkers() {
  const { mustCall, calledPocket, set } = usePool();
  if (!mustCall) return null;
  return (
    <group>
      {POCKETS.map((p, i) => {
        const out = i < 4 ? CORNER_POCKET_OUT : SIDE_POCKET_OUT;
        const x = p.x + Math.sign(p.x) * (i < 4 ? out : 0);
        const z = worldZ(p.y + Math.sign(p.y) * out);
        const on = calledPocket === i;
        return (
          <mesh
            // biome-ignore lint/suspicious/noArrayIndexKey: pocket id is the identity
            key={i}
            position={[x, SURFACE_Y + RAIL_TOP + 0.02, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              set({ calledPocket: i });
            }}
          >
            <ringGeometry args={[0.06, on ? 0.09 : 0.075, 40]} />
            <meshBasicMaterial
              color={on ? '#ffc93c' : '#fff1d6'}
              transparent
              opacity={on ? 1 : 0.6}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
