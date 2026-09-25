/**
 * Chickenz's screen transition: a grid of diamonds that grow in a diagonal sweep until they tile the
 * screen. Returns an SVG path for a mask/clip at `progress` 0 (clear) → 1 (covered).
 */
export const DIAMOND_WIPE = { cellPx: 64, sweep: 0.55 } as const;

export function diamondWipePath(
  progress: number,
  width: number,
  height: number,
  cellPx = DIAMOND_WIPE.cellPx,
) {
  const cols = Math.ceil(width / cellPx) + 1;
  const rows = Math.ceil(height / cellPx) + 1;
  const maxDiag = cols + rows;
  const parts: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Each cell starts growing a little after its diagonal neighbour, so the wipe rolls across.
      const delay = ((c + r) / maxDiag) * DIAMOND_WIPE.sweep;
      const local = Math.min(1, Math.max(0, (progress - delay) / (1 - DIAMOND_WIPE.sweep)));
      if (local <= 0) continue;
      // A diamond with half-diagonal = cell covers its cell exactly when fully grown.
      const h = local * cellPx;
      const cx = c * cellPx;
      const cy = r * cellPx;
      parts.push(`M${cx} ${cy - h}L${cx + h} ${cy}L${cx} ${cy + h}L${cx - h} ${cy}Z`);
    }
  }
  return parts.join('');
}
