import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three/webgpu';

import type { PickupId } from '@arena/sim-runner';

import { COLORS } from '../config.ts';

type Ctx = CanvasRenderingContext2D;

function canvasTexture(w: number, h: number, draw: (c: Ctx) => void, repeat = false): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (c) draw(c);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  return t;
}

const memo = <T>(make: () => T) => {
  let v: T | null = null;
  return () => {
    v ??= make();
    return v;
  };
};

/** The road: dark asphalt-glass with DAG Dasher's teal grid every 2 m (one tile = 2 × 2 m). */
export const roadTexture = memo(() =>
  canvasTexture(
    256,
    256,
    (c) => {
      c.fillStyle = COLORS.road;
      c.fillRect(0, 0, 256, 256);
      // Faint speckle so the surface reads as material, not flat colour.
      for (let i = 0; i < 900; i++) {
        const v = 20 + ((i * 97) % 23);
        c.fillStyle = `rgb(${v} ${v} ${v + 18} / 0.35)`;
        c.fillRect((i * 53) % 256, (i * 131) % 256, 2, 2);
      }
      c.strokeStyle = 'rgb(0 217 255 / 0.28)';
      c.lineWidth = 3;
      c.strokeRect(0, 0, 256, 256);
    },
    true,
  ),
);

/** Tower facades: a grid of windows, some lit teal, purple or warm. Tiles up the building. */
export const windowTexture = memo(() =>
  canvasTexture(
    128,
    256,
    (c) => {
      c.fillStyle = COLORS.building;
      c.fillRect(0, 0, 128, 256);
      const lit = [COLORS.windowTeal, COLORS.windowPurple, COLORS.windowWarm];
      for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 4; col++) {
          const k = (row * 7 + col * 13 + row * col * 3) % 17;
          c.fillStyle = k < 3 ? (lit[k % 3] as string) : '#12112a';
          c.globalAlpha = k < 3 ? 0.85 : 1;
          c.fillRect(11 + col * 30, 8 + row * 16, 14, 6);
        }
      }
      c.globalAlpha = 1;
    },
    true,
  ),
);

/** A far skyline strip: layered tower silhouettes against the horizon glow. */
export const skylineTexture = memo(() =>
  canvasTexture(2048, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, COLORS.sky);
    g.addColorStop(0.55, COLORS.skyHigh);
    g.addColorStop(1, COLORS.horizon);
    c.fillStyle = g;
    c.fillRect(0, 0, 2048, 512);
    for (let i = 0; i < 140; i++) {
      c.fillStyle = `rgb(255 255 255 / ${0.25 + ((i * 37) % 60) / 100})`;
      c.fillRect((i * 331) % 2048, (i * 97) % 260, 2, 2);
    }
    const layer = (base: number, tone: string, seed: number, lights: number) => {
      c.fillStyle = tone;
      let x = 0;
      let k = seed;
      while (x < 2048) {
        k = (k * 1103515245 + 12345) & 0x7fffffff;
        const w = 30 + (k % 70);
        const h = 60 + ((k >> 8) % 190);
        c.fillRect(x, 512 - base - h, w, h + base);
        for (let j = 0; j < lights; j++) {
          k = (k * 1103515245 + 12345) & 0x7fffffff;
          c.fillStyle = k % 2 ? 'rgb(53 231 255 / 0.7)' : 'rgb(176 124 255 / 0.7)';
          c.fillRect(x + 4 + (k % Math.max(1, w - 8)), 512 - base - h + 8 + ((k >> 5) % h), 3, 2);
          c.fillStyle = tone;
        }
        x += w + 2;
      }
    };
    layer(40, '#1a0f33', 7, 3);
    layer(0, '#0d0a1d', 19, 5);
  }),
);

const glyphTexture = (tone: string, draw: (c: Ctx) => void) =>
  canvasTexture(128, 128, (c) => {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.fillStyle = tone;
    c.strokeStyle = tone;
    draw(c);
  });

const chevron = (c: Ctx, y: number, up: boolean, extra: number) => {
  c.lineWidth = 16 + extra;
  c.beginPath();
  c.moveTo(24, y + (up ? 22 : -22));
  c.lineTo(64, y + (up ? -18 : 18));
  c.lineTo(104, y + (up ? 22 : -22));
  c.stroke();
};

/**
 * A verb glyph in white on a dark outline: it sits on glass of its own colour, so the colour
 * already says the verb and the glyph needs contrast, not more hue.
 */
const outlined = (draw: (c: Ctx, extra: number) => void) =>
  canvasTexture(128, 128, (c) => {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.strokeStyle = c.fillStyle = '#07060f';
    draw(c, 12);
    c.strokeStyle = c.fillStyle = '#ffffff';
    draw(c, 0);
  });

/** The verb on each barrier's face: ↑ jump, ↓ duck, ✕ move, ↓ with a bar over it for strict. */
export const verbIcon = memo(() => ({
  jump: outlined((c, x) => {
    chevron(c, 44, true, x);
    chevron(c, 84, true, x);
  }),
  duck: outlined((c, x) => {
    chevron(c, 44, false, x);
    chevron(c, 84, false, x);
  }),
  move: outlined((c, x) => {
    c.lineWidth = 20 + x;
    c.beginPath();
    c.moveTo(30, 30);
    c.lineTo(98, 98);
    c.moveTo(98, 30);
    c.lineTo(30, 98);
    c.stroke();
  }),
  strict: outlined((c, x) => {
    c.lineWidth = 14 + x;
    c.beginPath();
    c.moveTo(22, 24);
    c.lineTo(106, 24);
    c.stroke();
    chevron(c, 62, false, x);
    chevron(c, 98, false, x);
  }),
}));

/** Pickup glyphs: buffs are teal-green, debuffs red (the colour tells you before the shape). */
export const PICKUP_LOOK = {
  speed: { tone: '#5ee06a', label: 'Speed boost', tip: 'Faster for 5 s' },
  magnet: { tone: '#5ee06a', label: 'Coin magnet', tip: 'Coins fly to you for 8 s' },
  shield: { tone: '#5ee06a', label: 'Shield', tip: 'Blocks your next hit' },
  double: { tone: '#5ee06a', label: 'Double coins', tip: 'Coins count twice for 5 s' },
  slow: { tone: '#ff4d6d', label: 'Slow', tip: 'Slower for 4 s' },
  reverse: { tone: '#ff4d6d', label: 'Reversed', tip: 'Controls flipped for 3 s' },
  fog: { tone: '#ff4d6d', label: 'Fog', tip: 'Can’t see far for 5 s' },
} as const satisfies Record<PickupId, { tone: string; label: string; tip: string }>;

const PICKUP_GLYPHS: Record<PickupId, (c: Ctx) => void> = {
  speed: (c) => {
    c.beginPath();
    c.moveTo(74, 14);
    c.lineTo(34, 70);
    c.lineTo(60, 70);
    c.lineTo(50, 114);
    c.lineTo(94, 52);
    c.lineTo(66, 52);
    c.closePath();
    c.fill();
  },
  magnet: (c) => {
    c.lineWidth = 22;
    c.beginPath();
    c.arc(64, 60, 30, Math.PI, 0, true);
    c.stroke();
    c.fillStyle = '#fff1d6';
    c.fillRect(23, 60, 22, 18);
    c.fillRect(83, 60, 22, 18);
  },
  shield: (c) => {
    c.beginPath();
    c.moveTo(64, 14);
    c.lineTo(104, 30);
    c.quadraticCurveTo(104, 88, 64, 116);
    c.quadraticCurveTo(24, 88, 24, 30);
    c.closePath();
    c.fill();
  },
  double: (c) => {
    c.font = 'bold 64px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('×2', 64, 68);
  },
  slow: (c) => {
    c.lineWidth = 12;
    c.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.2) {
      const r = 6 + a * 3.2;
      c.lineTo(64 + Math.cos(a) * r, 60 + Math.sin(a) * r);
    }
    c.stroke();
    c.fillRect(20, 100, 88, 12);
  },
  reverse: (c) => {
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(28, 44);
    c.lineTo(100, 44);
    c.moveTo(100, 84);
    c.lineTo(28, 84);
    c.stroke();
    c.beginPath();
    c.moveTo(20, 44);
    c.lineTo(42, 24);
    c.lineTo(42, 64);
    c.closePath();
    c.moveTo(108, 84);
    c.lineTo(86, 64);
    c.lineTo(86, 104);
    c.closePath();
    c.fill();
  },
  fog: (c) => {
    c.beginPath();
    c.arc(46, 70, 22, 0, Math.PI * 2);
    c.arc(74, 58, 28, 0, Math.PI * 2);
    c.arc(92, 76, 18, 0, Math.PI * 2);
    c.fill();
    c.fillRect(30, 76, 70, 20);
  },
};

export const pickupIcon = memo(() => {
  const out = {} as Record<PickupId, Texture>;
  for (const id of Object.keys(PICKUP_GLYPHS) as PickupId[]) {
    out[id] = glyphTexture(PICKUP_LOOK[id].tone, PICKUP_GLYPHS[id]);
  }
  return out;
});

/** Chequered finish banner. */
export const finishTexture = memo(() =>
  canvasTexture(512, 64, (c) => {
    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 4; y++) {
        c.fillStyle = (x + y) % 2 ? '#101024' : COLORS.finish;
        c.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  }),
);
