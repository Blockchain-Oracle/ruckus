import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CanvasTexture, type Group, LatheGeometry, SRGBColorSpace, Vector2 } from 'three/webgpu';

import { BALL_RADIUS_M, CUE_BALL, F, STRIDE } from '@arena/sim-pool';

import { SURFACE_Y, worldZ } from '../config.ts';
import { aim } from '../match/aim.ts';
import type { PoolDriver } from '../match/driver.ts';

const R = BALL_RADIUS_M;
const CUE_LEN = 1.47;
/** Tip sits this far off the ball at rest, and pulls back up to MAX_DRAW at full power. */
const REST_GAP = 0.012;
const MAX_DRAW = 0.26;
/** The cue rides slightly raised over the rail (a real stroke is never perfectly level). */
const ELEVATION = 0.06;
/** After the strike the cue follows through and fades. */
const FOLLOW_S = 0.18;
const FADE_S = 0.35;

/** Cue profile (radius by distance from the tip), turned on a lathe. */
function cueGeometry() {
  const pts: Vector2[] = [];
  const add = (r: number, y: number) => pts.push(new Vector2(r, y));
  add(0, 0);
  add(0.0062, 0);
  add(0.0064, 0.008); // tip (leather)
  add(0.0065, 0.009);
  add(0.0066, 0.03); // ferrule
  add(0.0068, 0.031);
  add(0.0085, 0.5); // shaft taper
  add(0.0105, 0.72); // joint
  add(0.0108, 0.73);
  add(0.0118, 1.02); // forearm
  add(0.0126, 1.08); // wrap
  add(0.0128, 1.34);
  add(0.0138, 1.4); // butt sleeve
  add(0.0142, CUE_LEN - 0.01);
  add(0.012, CUE_LEN);
  add(0, CUE_LEN);
  return new LatheGeometry(pts, 32);
}

/** Wood, joint ring, wrap and butt as bands down the lathe's v coordinate. */
function cueTexture() {
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const band = (from: number, to: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, h - (to / CUE_LEN) * h, 8, ((to - from) / CUE_LEN) * h);
  };
  band(0, 0.009, '#2d6bb0'); // chalked tip
  band(0.009, 0.031, '#f3efe4'); // ferrule
  band(0.031, 0.72, '#e2c79a'); // maple shaft
  band(0.72, 0.73, '#c9b37a'); // joint ring
  band(0.73, 1.08, '#3b1d12'); // ebony forearm
  band(1.08, 1.34, '#141414'); // wrap
  band(1.34, CUE_LEN, '#2a130b'); // butt
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The cue: laid behind the cue ball along the aim, drawn back with power, follows through on the strike. */
export function Cue({ driver, show }: { driver: () => PoolDriver; show: () => boolean }) {
  const group = useRef<Group>(null);
  const geo = useMemo(cueGeometry, []);
  const tex = useMemo(cueTexture, []);
  const st = useRef({ struckAt: -1, lastPhase: 'aim', opacity: 0 });

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const d = driver();
    const t = clock.elapsedTime;
    const s = st.current;
    if (d.phase === 'rolling' && s.lastPhase !== 'rolling') s.struckAt = t;
    s.lastPhase = d.phase;
    const visible = show();
    const since = s.struckAt < 0 ? Number.POSITIVE_INFINITY : t - s.struckAt;
    const aiming = visible && d.phase === 'aim';
    const target = aiming
      ? 1
      : since < FOLLOW_S + FADE_S && d.phase === 'rolling'
        ? 1 - Math.max(0, since - FOLLOW_S) / FADE_S
        : 0;
    s.opacity += (target - s.opacity) * Math.min(1, delta * 12);
    g.visible = s.opacity > 0.02;
    if (!g.visible) return;

    const b = d.balls;
    const cx = b[CUE_BALL * STRIDE + F.x] ?? 0;
    const cz = worldZ(b[CUE_BALL * STRIDE + F.y] ?? 0);
    // Aim in world xz (sim y is world −z); "right" of the aim is ẑ-up × aim on screen.
    const ax = aim.dx;
    const az = -aim.dy;
    const rx = -az;
    const rz = ax;
    const gap = aiming ? REST_GAP + aim.power * MAX_DRAW : Math.max(-0.03, REST_GAP - since * 0.4);
    // Place the tip behind the ball along −aim, then lay the cue back along −aim, raised a little.
    const back = R + gap;
    // The tip meets the ball where the spin control says: side offset and height.
    const side = aim.spinX * R * 0.5;
    const tipX = cx - ax * back + rx * side;
    const tipZ = cz - az * back + rz * side;
    g.position.set(tipX, SURFACE_Y + R + aim.spinY * R * 0.5, tipZ);
    g.rotation.set(0, 0, 0);
    // Lathe runs along +y from the tip: point +y backwards along −aim and tilt up by ELEVATION.
    g.lookAt(tipX - ax * 10, SURFACE_Y + R + 10 * ELEVATION, tipZ - az * 10);
    g.rotateX(Math.PI / 2);
    for (const child of g.children) {
      const mat = (child as unknown as { material?: { opacity: number; transparent: boolean } })
        .material;
      if (mat) {
        mat.transparent = s.opacity < 0.99;
        mat.opacity = s.opacity;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial map={tex} roughness={0.35} clearcoat={0.7} clearcoatRoughness={0.2} />
      </mesh>
    </group>
  );
}
