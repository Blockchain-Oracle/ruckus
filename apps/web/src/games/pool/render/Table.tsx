import { useMemo } from 'react';
import {
  CanvasTexture,
  ExtrudeGeometry,
  Path,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from 'three/webgpu';

import { HALF_L, HALF_W, TABLE } from '@arena/sim-pool';

import {
  APRON_H,
  COLORS,
  CORNER_POCKET_OUT,
  CORNER_POCKET_R,
  CUSHION_TOP,
  CUSHION_W,
  RAIL_TOP,
  RAIL_W,
  SIDE_POCKET_OUT,
  SIDE_POCKET_R,
  SURFACE_Y,
} from '../config.ts';

/**
 * The table, built from the same numbers the physics uses (so what you see is what the balls hit).
 * Shapes are drawn in (x, −y) and laid flat, which puts sim y on world +z.
 */

type P = { x: number; y: number };
const OUTER_L = HALF_L + CUSHION_W;
const OUTER_W = HALF_W + CUSHION_W;

const POCKET_CUPS: readonly (P & { r: number })[] = [
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sy) => ({
      x: sx * (HALF_L + CORNER_POCKET_OUT),
      y: sy * (HALF_W + CORNER_POCKET_OUT),
      r: CORNER_POCKET_R,
    })),
  ),
  ...[-1, 1].map((sy) => ({ x: 0, y: sy * (HALF_W + SIDE_POCKET_OUT), r: SIDE_POCKET_R })),
];

/** Fine noise and a faint nap sheen make the cloth read as cloth, not a flat colour. */
function clothTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.fillStyle = COLORS.cloth;
  ctx.fillRect(0, 0, size, size);
  // Deterministic speckle (no Math.random in render code either: stable look across reloads).
  let s = 12345;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 26000; i++) {
    const a = rnd() * 0.06;
    ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd(), 1 + rnd());
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(6, 3);
  t.anisotropy = 8;
  return t;
}

function wedge(points: P[]) {
  const shape = new Shape();
  points.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, -p.y);
    else shape.lineTo(p.x, -p.y);
  });
  shape.closePath();
  return shape;
}

/** The jaw segment that starts at knuckle (x, y), if any. */
function jawTip(x: number, y: number): P {
  const s = TABLE.segments.find(
    (seg) =>
      Math.abs(seg.ax - x) < 1e-9 &&
      Math.abs(seg.ay - y) < 1e-9 &&
      seg.ax !== seg.bx &&
      seg.ay !== seg.by,
  );
  return s ? { x: s.bx, y: s.by } : { x, y };
}

/** Six cushion prisms: each rail's straight face plus its angled jaw facings. */
function cushionShapes(): Shape[] {
  const rails = TABLE.segments.filter((s) => s.ax === s.bx || s.ay === s.by);
  return rails.map((s) => {
    const a = jawTip(s.ax, s.ay);
    const b = jawTip(s.bx, s.by);
    const horizontal = s.ay === s.by;
    // Push the back of the cushion out to the wood line.
    const back = (p: P): P =>
      horizontal
        ? { x: p.x, y: Math.sign(s.ay) * OUTER_W }
        : { x: Math.sign(s.ax) * OUTER_L, y: p.y };
    return wedge([a, { x: s.ax, y: s.ay }, { x: s.bx, y: s.by }, b, back(b), back(a)]);
  });
}

/**
 * The playing rectangle's outline with every pocket cup traced round: bulging out (the hole in the
 * wooden frame, rectangle ∪ cups) or cutting in (the cloth, rectangle − cups). One path, walked
 * anticlockwise, so three.js triangulates it cleanly.
 */
function tracePocketed(path: Path | Shape, outward: boolean) {
  const ll = OUTER_L;
  const ww = OUTER_W;
  const [bl, tl, br, tr, sb, st] = [0, 1, 2, 3, 4, 5].map(
    (i) => POCKET_CUPS[i] as P & { r: number },
  ) as [
    P & { r: number },
    P & { r: number },
    P & { r: number },
    P & { r: number },
    P & { r: number },
    P & { r: number },
  ];
  const at = (c: P, x: number, y: number) => Math.atan2(y - c.y, x - c.x);
  const onH = (c: P & { r: number }, y: number) =>
    Math.sqrt(Math.max(0, c.r * c.r - (y - c.y) ** 2));
  const onV = (c: P & { r: number }, x: number) =>
    Math.sqrt(Math.max(0, c.r * c.r - (x - c.x) ** 2));
  const arc = (c: P & { r: number }, x0: number, y0: number, x1: number, y1: number) =>
    path.absarc(c.x, c.y, c.r, at(c, x0, y0), at(c, x1, y1), !outward);
  path.moveTo(bl.x + onH(bl, -ww), -ww);
  path.lineTo(sb.x - onH(sb, -ww), -ww);
  arc(sb, sb.x - onH(sb, -ww), -ww, sb.x + onH(sb, -ww), -ww);
  path.lineTo(br.x - onH(br, -ww), -ww);
  arc(br, br.x - onH(br, -ww), -ww, ll, br.y + onV(br, ll));
  path.lineTo(ll, tr.y - onV(tr, ll));
  arc(tr, ll, tr.y - onV(tr, ll), tr.x - onH(tr, ww), ww);
  path.lineTo(st.x + onH(st, ww), ww);
  arc(st, st.x + onH(st, ww), ww, st.x - onH(st, ww), ww);
  path.lineTo(tl.x + onH(tl, ww), ww);
  arc(tl, tl.x + onH(tl, ww), ww, -ll, tl.y - onV(tl, -ll));
  path.lineTo(-ll, bl.y + onV(bl, -ll));
  arc(bl, -ll, bl.y + onV(bl, -ll), bl.x + onH(bl, -ww), -ww);
}

/** Wood frame: an outer rounded slab with the playing area and pocket bulges cut out. */
function railShape() {
  const ol = OUTER_L + RAIL_W;
  const ow = OUTER_W + RAIL_W;
  const r = 0.05;
  const shape = new Shape();
  shape.moveTo(-ol + r, -ow);
  shape.lineTo(ol - r, -ow);
  shape.quadraticCurveTo(ol, -ow, ol, -ow + r);
  shape.lineTo(ol, ow - r);
  shape.quadraticCurveTo(ol, ow, ol - r, ow);
  shape.lineTo(-ol + r, ow);
  shape.quadraticCurveTo(-ol, ow, -ol, ow - r);
  shape.lineTo(-ol, -ow + r);
  shape.quadraticCurveTo(-ol, -ow, -ol + r, -ow);
  const hole = new Path();
  tracePocketed(hole, true);
  shape.holes.push(hole);
  return shape;
}

/** Cloth: the playing area out to the cushion backs, with the pocket mouths cut away. */
function clothShape() {
  const shape = new Shape();
  tracePocketed(shape, false);
  return shape;
}

export function Table() {
  const cloth = useMemo(clothTexture, []);
  const geo = useMemo(() => {
    const cushions = cushionShapes().map(
      (s) =>
        new ExtrudeGeometry(s, {
          depth: CUSHION_TOP,
          bevelEnabled: true,
          bevelThickness: 0.004,
          bevelSize: 0.004,
          bevelSegments: 3,
          curveSegments: 4,
        }),
    );
    const rails = new ExtrudeGeometry(railShape(), {
      depth: RAIL_TOP + 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.01,
      bevelSegments: 4,
      curveSegments: 24,
    });
    const felt = new ExtrudeGeometry(clothShape(), { depth: 0.02, bevelEnabled: false });
    return { cushions, rails, felt };
  }, []);

  const diamonds = useMemo(() => {
    const out: [number, number][] = [];
    const along = OUTER_W + RAIL_W / 2;
    for (const f of [-3, -2, -1, 1, 2, 3])
      for (const sy of [-1, 1]) out.push([(f * HALF_L) / 4, sy * along]);
    const across = OUTER_L + RAIL_W / 2;
    for (const f of [-1, 0, 1]) for (const sx of [-1, 1]) out.push([sx * across, (f * HALF_W) / 2]);
    return out;
  }, []);

  return (
    <group>
      {/* Cloth over the slate. */}
      <mesh
        geometry={geo.felt}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, SURFACE_Y - 0.02, 0]}
        receiveShadow
      >
        <meshStandardMaterial map={cloth} roughness={0.95} metalness={0} />
      </mesh>
      {geo.cushions.map((g, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed geometry list
          key={i}
          geometry={g}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, SURFACE_Y, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial map={cloth} color="#d9eef5" roughness={0.9} />
        </mesh>
      ))}
      <mesh
        geometry={geo.rails}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, SURFACE_Y - 0.02, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={COLORS.rail}
          roughness={0.38}
          clearcoat={0.8}
          clearcoatRoughness={0.25}
        />
      </mesh>
      {/* Apron and body. */}
      <mesh position={[0, SURFACE_Y - 0.02 - APRON_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[2 * (OUTER_L + RAIL_W) - 0.04, APRON_H, 2 * (OUTER_W + RAIL_W) - 0.04]}
        />
        <meshPhysicalMaterial color={COLORS.apron} roughness={0.45} clearcoat={0.5} />
      </mesh>
      {/* Legs. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (HALF_L - 0.1), (SURFACE_Y - APRON_H) / 2, sz * (HALF_W - 0.05)]}
            castShadow
          >
            <boxGeometry args={[0.16, SURFACE_Y - APRON_H, 0.16]} />
            <meshStandardMaterial color={COLORS.apron} roughness={0.5} />
          </mesh>
        )),
      )}
      {/* Pocket cups and leather rims. */}
      {POCKET_CUPS.map((p) => (
        <group key={`${p.x}:${p.y}`} position={[p.x, SURFACE_Y, p.y]}>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[p.r, p.r * 0.85, 0.12, 32, 1, true]} />
            <meshStandardMaterial color={COLORS.pocket} roughness={1} side={2} />
          </mesh>
          {/* A dark throat just under the cloth, so the apron never shows through the hole. */}
          <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[p.r, 32]} />
            <meshBasicMaterial color={COLORS.pocket} />
          </mesh>
          <mesh position={[0, -0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[p.r * 0.86, 32]} />
            <meshStandardMaterial color={COLORS.pocket} roughness={1} />
          </mesh>
          <mesh position={[0, RAIL_TOP + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[p.r + 0.006, 0.01, 12, 40]} />
            <meshStandardMaterial color={COLORS.leather} roughness={0.55} />
          </mesh>
        </group>
      ))}
      {diamonds.map(([x, z]) => (
        <mesh
          key={`${x}:${z}`}
          position={[x, SURFACE_Y + RAIL_TOP + 0.011, z]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        >
          <planeGeometry args={[0.014, 0.014]} />
          <meshStandardMaterial color={COLORS.diamond} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
