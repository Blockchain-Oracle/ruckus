import { CanvasTexture, SRGBColorSpace } from 'three/webgpu';

import type { PowerUpKind } from '@arena/sim-soccer';

/** Eggy's colour code: green helps you, yellow changes the ball, red hurts the other team. */
export const POWER_LOOK = {
  speed: { tone: '#5ee06a', label: 'Speed' },
  growPlayer: { tone: '#5ee06a', label: 'Big egg' },
  bouncy: { tone: '#ffd23a', label: 'Bouncy ball' },
  growBall: { tone: '#ffd23a', label: 'Big ball' },
  shrinkBall: { tone: '#ffd23a', label: 'Tiny ball' },
  freeze: { tone: '#ff5a5a', label: 'Freeze' },
  shrinkPlayer: { tone: '#ff5a5a', label: 'Tiny egg' },
} as const satisfies Record<PowerUpKind, { tone: string; label: string }>;

const SIZE = 128;

type Draw = (c: CanvasRenderingContext2D) => void;
const arrow = (c: CanvasRenderingContext2D, x: number, y: number, up: boolean, s: number) => {
  const d = up ? -1 : 1;
  c.beginPath();
  c.moveTo(x, y + d * s);
  c.lineTo(x - s, y);
  c.lineTo(x - s * 0.4, y);
  c.lineTo(x - s * 0.4, y - d * s);
  c.lineTo(x + s * 0.4, y - d * s);
  c.lineTo(x + s * 0.4, y);
  c.lineTo(x + s, y);
  c.closePath();
  c.fill();
  c.stroke();
};
const ball = (c: CanvasRenderingContext2D, r: number) => {
  c.beginPath();
  c.arc(64, 64, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#1b1024';
  c.beginPath();
  c.arc(64, 64, r * 0.32, 0, Math.PI * 2);
  c.fill();
};

/** Hand-drawn glyphs (paths, no emoji fonts), so they look the same on every device. */
const GLYPHS: Record<PowerUpKind, Draw> = {
  speed: (c) => {
    c.beginPath();
    c.moveTo(74, 16);
    c.lineTo(36, 70);
    c.lineTo(60, 70);
    c.lineTo(50, 112);
    c.lineTo(92, 52);
    c.lineTo(68, 52);
    c.closePath();
    c.fill();
    c.stroke();
  },
  growPlayer: (c) => {
    arrow(c, 64, 52, true, 30);
    arrow(c, 64, 96, true, 22);
  },
  shrinkPlayer: (c) => {
    arrow(c, 64, 76, false, 30);
    arrow(c, 64, 34, false, 22);
  },
  growBall: (c) => ball(c, 40),
  shrinkBall: (c) => ball(c, 20),
  bouncy: (c) => {
    c.beginPath();
    c.moveTo(30, 100);
    for (let i = 0; i < 5; i++) c.lineTo(i % 2 ? 36 : 92, 88 - i * 14);
    c.lineTo(64, 24);
    c.lineWidth = 12;
    c.stroke();
    ball(c, 16);
  },
  freeze: (c) => {
    c.lineWidth = 10;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      c.beginPath();
      c.moveTo(64 - Math.cos(a) * 44, 64 - Math.sin(a) * 44);
      c.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44);
      c.stroke();
    }
  },
};

const cache = new Map<PowerUpKind, CanvasTexture>();
export function powerIcon(kind: PowerUpKind) {
  const hit = cache.get(kind);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('2D canvas unavailable');
  c.fillStyle = '#fff8e6';
  c.strokeStyle = '#1b1024';
  c.lineWidth = 7;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  GLYPHS[kind](c);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  cache.set(kind, t);
  return t;
}
