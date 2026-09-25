import { CanvasTexture, SRGBColorSpace } from 'three/webgpu';

import { BALL_HUES } from '../config.ts';

const W = 1024;
const H = 512;
/** Stripe band spans this share of the height (latitudes about ±30°). */
const STRIPE_BAND = 0.34;
/** Number disc radius as a share of the texture height. */
const DISC_R = 0.12;

/**
 * An equirectangular ball skin: base colour or white with a stripe band, and the number disc
 * printed twice (front and back), as on a real set. Drawn once per ball and cached.
 */
function draw(n: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const stripe = n >= 9;
  const hue = BALL_HUES[stripe ? n - 8 : n] ?? '#ffffff';
  ctx.fillStyle = stripe || n === 0 ? BALL_HUES[0] : hue;
  ctx.fillRect(0, 0, W, H);
  if (stripe) {
    ctx.fillStyle = hue;
    ctx.fillRect(0, H * (0.5 - STRIPE_BAND / 2), W, H * STRIPE_BAND);
  }
  if (n === 0) {
    // The cue ball's red dot helps read spin (as on measle/pro cue balls).
    ctx.fillStyle = '#c8241c';
    for (const x of [0.25, 0.75]) {
      ctx.beginPath();
      ctx.ellipse(W * x, H / 2, H * 0.028 * 2, H * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (const x of [0.25, 0.75]) {
      // Equirect stretches horizontally: an ellipse twice as wide reads round on the sphere.
      ctx.fillStyle = '#fbf7ec';
      ctx.beginPath();
      ctx.ellipse(W * x, H / 2, H * DISC_R * 2, H * DISC_R, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(W * x, H / 2);
      ctx.scale(2, 1);
      ctx.fillStyle = '#141414';
      ctx.font = `700 ${Math.round(H * 0.15)}px Rubik, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), 0, H * 0.008);
      if (n === 6 || n === 9) ctx.fillRect(-H * 0.035, H * 0.06, H * 0.07, H * 0.008);
      ctx.restore();
    }
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const cache = new Map<number, CanvasTexture>();
export function ballTexture(n: number) {
  let t = cache.get(n);
  if (!t) {
    t = draw(n);
    cache.set(n, t);
  }
  return t;
}
