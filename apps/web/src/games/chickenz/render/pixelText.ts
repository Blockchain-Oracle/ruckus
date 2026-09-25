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
