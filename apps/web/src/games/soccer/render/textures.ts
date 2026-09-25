import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace } from 'three/webgpu';

import { COLORS } from '../config.ts';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, repeat = false) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}

/** A tiny seeded PRNG for set dressing: the stadium looks the same every visit. */
export function dressingRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mowed grass seen from the side: stripes run across the pitch (along x), with the halfway line,
 * centre circle and touchline painted in pitch space. u spans x ∈ [−span, span], v spans z.
 */
export function grassTexture(spanX: number, depth: number, frontZ: number) {
  const PX_PER_UNIT = 96;
  const w = Math.round(spanX * 2 * PX_PER_UNIT);
  const h = Math.round(depth * PX_PER_UNIT);
  const { c, ctx } = canvas(w, h);
  const stripes = 18;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? COLORS.grass : COLORS.grassDark;
    ctx.fillRect((i * w) / stripes, 0, w / stripes + 1, h);
  }
  // Fine blade noise so the stripes don't read as flat plastic.
  const rnd = dressingRandom(0xa11);
  for (let i = 0; i < w * h * 0.02; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
  }
  const X = (x: number) => (x + spanX) * PX_PER_UNIT;
  // Canvas top is the far side once the plane is laid flat (its +v points to world −z).
  const backZ = frontZ - depth;
  const Z = (z: number) => (z - backZ) * PX_PER_UNIT;
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(X(0), Z(frontZ - 0.3));
  ctx.lineTo(X(0), Z(-2.2));
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(X(0), Z(0), 1.5 * PX_PER_UNIT, 1.1 * PX_PER_UNIT, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(-spanX), Z(-2.2));
  ctx.lineTo(X(spanX), Z(-2.2));
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.strokeRect(
      Math.min(X(side * 6.2), X(side * 4.4)),
      Z(-1.6),
      Math.abs(X(side * 6.2) - X(side * 4.4)),
      3.2 * PX_PER_UNIT,
    );
    ctx.beginPath();
    ctx.moveTo(X(side * 6.2), Z(frontZ - 0.3));
    ctx.lineTo(X(side * 6.2), Z(-2.2));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return finish(c);
}

/** Diamond goal mesh, tiled. */
export function netTexture() {
  const S = 64;
  const { c, ctx } = canvas(S, S);
  ctx.strokeStyle = COLORS.net;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, S / 2);
  ctx.lineTo(S / 2, 0);
  ctx.lineTo(S, S / 2);
  ctx.lineTo(S / 2, S);
  ctx.closePath();
  ctx.stroke();
  return finish(c, true);
}

/** LED board ribbon: scrolls along u, so its texture offset animates the adverts. */
export function boardTexture() {
  const { c, ctx } = canvas(2048, 96);
  const ads = [
    { text: 'RUCKUS', bg: '#ff5a36', fg: '#fff1d6' },
    { text: 'CHAIN JAM', bg: '#1b1024', fg: '#ffc23a' },
    { text: 'EGG LEAGUE', bg: '#8c6bff', fg: '#fff1d6' },
    { text: 'VRF FAIR PLAY', bg: '#2ec4b6', fg: '#1b1024' },
  ];
  const cell = c.width / ads.length;
  ads.forEach((ad, i) => {
    ctx.fillStyle = ad.bg;
    ctx.fillRect(i * cell, 0, cell, c.height);
    ctx.fillStyle = ad.fg;
    ctx.font = '700 58px Bungee, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ad.text, i * cell + cell / 2, c.height / 2 + 3);
  });
  // LED pixel grid.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let x = 0; x < c.width; x += 4) ctx.fillRect(x, 0, 1, c.height);
  for (let y = 0; y < c.height; y += 4) ctx.fillRect(0, y, c.width, 1);
  return finish(c, true);
}

/** Night sky: deep indigo to a violet glow over the stadium rim, with a scatter of stars. */
export function skyTexture() {
  const { c, ctx } = canvas(512, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, COLORS.sky);
  g.addColorStop(0.62, '#140d33');
  g.addColorStop(1, COLORS.skyGlow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const rnd = dressingRandom(0x57a);
  for (let i = 0; i < 260; i++) {
    const a = rnd() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255,248,230,${a * (1 - i / 400)})`;
    const s = rnd() < 0.08 ? 2 : 1;
    ctx.fillRect(rnd() * 512, rnd() * 330, s, s);
  }
  return finish(c);
}

/** A soft radial glow for floodlights (drawn additively). */
export function glowTexture() {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,248,225,1)');
  g.addColorStop(0.25, 'rgba(255,236,190,0.55)');
  g.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c);
}
