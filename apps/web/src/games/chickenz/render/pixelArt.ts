import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three/webgpu';

/**
 * Tiny hand-authored pixel art as character maps (one char = one texel). Used for the guns, which
 * Chickenz drew itself (not licensed for reuse), on the Pixel Adventure palette.
 */
export type PixelArt = { rows: readonly string[]; palette: Readonly<Record<string, string>> };

export function pixelTexture({ rows, palette }: PixelArt): {
  texture: CanvasTexture;
  w: number;
  h: number;
} {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = palette[row[x] ?? '.'];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return { texture, w, h };
}
