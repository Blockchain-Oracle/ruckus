import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three/webgpu';

/**
 * World-space text in Chickenz's HUD font (Silkscreen), drawn once into a canvas at a multiple of
 * its pixel size so it stays crisp under the 1.5× kill-cam on a 2× display.
 */
const OVERSAMPLE = 4;
const FAMILY = 'Silkscreen';

type Style = {
  sizePx: number;
  color: string;
  /** Chickenz names: a hard 1 px drop shadow. */
  shadow?: { dx: number; dy: number; color: string };
  /** Chickenz alerts: a 2 px outline. */
  stroke?: { width: number; color: string };
};

export type PixelText = { texture: CanvasTexture; widthPx: number; heightPx: number };

let fontReady: Promise<unknown> | null = null;
/** Resolves once Silkscreen can rasterise; canvases drawn before that fall back to monospace. */
export const loadPixelFont = () => {
  fontReady ??= document.fonts.load(`${10 * OVERSAMPLE}px ${FAMILY}`).catch(() => undefined);
  return fontReady;
};

export function pixelText(text: string, style: Style): PixelText {
  const s = OVERSAMPLE;
  const pad = Math.max(
    style.stroke?.width ?? 0,
    Math.abs(style.shadow?.dx ?? 0),
    Math.abs(style.shadow?.dy ?? 0),
  );
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const font = `${style.sizePx * s}px ${FAMILY}, ui-monospace, monospace`;
  ctx.font = font;
  const widthPx = Math.ceil(ctx.measureText(text).width / s) + pad * 2;
  const heightPx = Math.ceil(style.sizePx * 1.25) + pad * 2;
  canvas.width = widthPx * s;
  canvas.height = heightPx * s;
  // Resizing the canvas resets its state.
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  if (style.stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = style.stroke.width * 2 * s;
    ctx.strokeStyle = style.stroke.color;
    ctx.strokeText(text, cx, cy);
  }
  if (style.shadow) {
    ctx.fillStyle = style.shadow.color;
    ctx.fillText(text, cx + style.shadow.dx * s, cy + style.shadow.dy * s);
  }
  ctx.fillStyle = style.color;
  ctx.fillText(text, cx, cy);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return { texture, widthPx, heightPx };
}

const BUBBLE_TEXT_PX = 8;
const BUBBLE_PAD_X_PX = 4;
const BUBBLE_PAD_Y_PX = 3;
const BUBBLE_TAIL_PX = 3;

/**
 * A pixel-art speech bubble (1 px ink outline, notched corners, a tail at the bottom centre) drawn
 * on the pixel grid, so it matches the Pixel Adventure sprites instead of looking like UI chrome.
 */
export function pixelBubble(text: string, ink = '#1b1024', paper = '#fff1d6'): PixelText {
  const s = OVERSAMPLE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  const font = `${BUBBLE_TEXT_PX * s}px ${FAMILY}, ui-monospace, monospace`;
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(text).width / s);
  const boxW = textW + BUBBLE_PAD_X_PX * 2 + 2;
  const boxH = BUBBLE_TEXT_PX + BUBBLE_PAD_Y_PX * 2 + 2;
  const widthPx = boxW;
  const heightPx = boxH + BUBBLE_TAIL_PX;
  canvas.width = widthPx * s;
  canvas.height = heightPx * s;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * s, y * s, w * s, h * s);
  };
  // Outline with notched corners, then the paper inside it.
  px(1, 0, boxW - 2, boxH, ink);
  px(0, 1, boxW, boxH - 2, ink);
  px(2, 1, boxW - 4, boxH - 2, paper);
  px(1, 2, boxW - 2, boxH - 4, paper);
  // Tail: a stepped triangle pointing down at the bird.
  const mid = Math.floor(boxW / 2);
  for (let i = 0; i < BUBBLE_TAIL_PX; i++) {
    const half = BUBBLE_TAIL_PX - i;
    px(mid - half, boxH - 1 + i, half * 2, 1, ink);
    if (half > 1) px(mid - half + 1, boxH - 1 + i, half * 2 - 2, 1, paper);
  }
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.fillText(text, (boxW / 2) * s, (boxH / 2 + 0.5) * s);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return { texture, widthPx, heightPx };
}
