import {
  BufferAttribute,
  CanvasTexture,
  Color,
  LatheGeometry,
  SRGBColorSpace,
  Vector2,
} from 'three/webgpu';

import { COLORS } from '../config.ts';

/** Egg height over its width; the body circle is the sim's, the extra rises above it. */
export const EGG_TALL = 1.18;
/** The egg is widest a little below its middle. */
const EGG_BELLY = 0.13;
const EGG_SEGMENTS = 40;
const EGG_RINGS = 28;
/** The kit band wraps the lower belly (profile height −1…1). */
const BAND = { from: -0.52, to: -0.3 } as const;

/**
 * A unit egg (radius 1 at its widest, centred on the origin), vertex-coloured: body above, kit
 * band round the belly. Built per player so each can carry its own kit.
 */
export function eggGeometry(body: string, band: string) {
  const pts: Vector2[] = [];
  for (let i = 0; i <= EGG_RINGS; i++) {
    const t = i / EGG_RINGS;
    const y = -Math.cos(t * Math.PI);
    const r = Math.sqrt(Math.max(0, 1 - y * y)) * (1 - EGG_BELLY * y);
    pts.push(new Vector2(Math.max(r, 1e-4), y * EGG_TALL));
  }
  const g = new LatheGeometry(pts, EGG_SEGMENTS);
  const pos = g.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const a = new Color(body).convertSRGBToLinear();
  const b = new Color(band).convertSRGBToLinear();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / EGG_TALL;
    const c = y > BAND.from && y < BAND.to ? b : a;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

/**
 * A classic black-and-white football, drawn once: every texel finds its nearest of the 32 panel
 * centres of a truncated icosahedron (12 pentagons, 20 hexagons); pentagons are ink, and texels
 * nearly equidistant to two centres are seams.
 */
let footballTex: CanvasTexture | null = null;
export function footballTexture() {
  if (footballTex) return footballTex;
  const phi = (1 + Math.sqrt(5)) / 2;
  const norm = (v: number[]) => {
    const l = Math.hypot(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    return v.map((c) => c / l);
  };
  const pent: number[][] = [];
  for (const s1 of [-1, 1])
    for (const s2 of [-1, 1]) {
      pent.push(norm([0, s1, s2 * phi]), norm([s1, s2 * phi, 0]), norm([s2 * phi, 0, s1]));
    }
  const hex: number[][] = [];
  for (const s1 of [-1, 1])
    for (const s2 of [-1, 1]) for (const s3 of [-1, 1]) hex.push(norm([s1, s2, s3]));
  for (const s1 of [-1, 1])
    for (const s2 of [-1, 1]) {
      hex.push(
        norm([0, s1 / phi, s2 * phi]),
        norm([s1 / phi, s2 * phi, 0]),
        norm([s2 * phi, 0, s1 / phi]),
      );
    }
  const centres = [
    ...pent.map((c) => ({ c, pent: true })),
    ...hex.map((c) => ({ c, pent: false })),
  ];
  const W = 512;
  const H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    const lat = (0.5 - (py + 0.5) / H) * Math.PI;
    for (let px = 0; px < W; px++) {
      const lon = ((px + 0.5) / W) * Math.PI * 2;
      const d = [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
      let best = -2;
      let second = -2;
      let isPent = false;
      for (const k of centres) {
        const dot =
          (d[0] ?? 0) * (k.c[0] ?? 0) + (d[1] ?? 0) * (k.c[1] ?? 0) + (d[2] ?? 0) * (k.c[2] ?? 0);
        if (dot > best) {
          second = best;
          best = dot;
          isPent = k.pent;
        } else if (dot > second) second = dot;
      }
      const seam = best - second < 0.018;
      const v = seam ? 70 : isPent ? 28 : 246;
      const o = (py * W + px) * 4;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = isPent && !seam ? v + 8 : v;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  footballTex = new CanvasTexture(canvas);
  footballTex.colorSpace = SRGBColorSpace;
  footballTex.anisotropy = 4;
  return footballTex;
}
