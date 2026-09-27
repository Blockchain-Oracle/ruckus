import type { Camera, Vector3 } from 'three/webgpu';

/**
 * Type-only three imports on purpose: the DOM label layer (ui/game/WorldLabels) is part of the
 * shell, and a runtime import from three here would pull all of three.js into first paint.
 */

/** A name chip riding above a character (ADR-008 "who is who"). */
export type LabelSpec = { text: string; color: string; you: boolean };

type Entry = LabelSpec & { x: number; y: number; z: number };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
let version = 0;
let camera: Camera | null = null;

const bump = () => {
  version += 1;
  for (const l of listeners) l();
};

/**
 * Scenes call this every frame with a world position (above the head). Only a change of text,
 * colour or "you" re-renders the DOM layer; positions are read by its own frame loop.
 */
export function setLabel(id: string, spec: LabelSpec, at: Vector3) {
  const e = entries.get(id);
  if (!e) {
    entries.set(id, { ...spec, x: at.x, y: at.y, z: at.z });
    bump();
    return;
  }
  e.x = at.x;
  e.y = at.y;
  e.z = at.z;
  if (e.text !== spec.text || e.color !== spec.color || e.you !== spec.you) {
    Object.assign(e, spec);
    bump();
  }
}

export function removeLabel(id: string) {
  if (entries.delete(id)) bump();
}

/** The canvas hands over its camera each frame, so the DOM layer can project. */
export function setLabelCamera(c: Camera) {
  camera = c;
}

export const labelStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  version: () => version,
  list: () => [...entries.entries()],
};

/** A column-major 4×4 matrix (Matrix4.elements): a tuple, so every index is known to exist. */
type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** NDC beyond this counts as off-screen (a little slack so chips slide out, not pop). */
const OFFSCREEN_NDC = 1.2;

/**
 * Screen position (px) of a label, or null when behind the camera or well off-screen: the same
 * maths as Vector3.project, on the camera's column-major matrices.
 */
export function projectLabel(id: string, width: number, height: number) {
  const e = entries.get(id);
  if (!e || !camera) return null;
  const v = camera.matrixWorldInverse.elements as Mat4;
  const p = camera.projectionMatrix.elements as Mat4;
  const vx = v[0] * e.x + v[4] * e.y + v[8] * e.z + v[12];
  const vy = v[1] * e.x + v[5] * e.y + v[9] * e.z + v[13];
  const vz = v[2] * e.x + v[6] * e.y + v[10] * e.z + v[14];
  const vw = v[3] * e.x + v[7] * e.y + v[11] * e.z + v[15];
  const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12] * vw;
  const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13] * vw;
  const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15] * vw;
  if (cw <= 0) return null;
  const nx = cx / cw;
  const ny = cy / cw;
  if (Math.abs(nx) > OFFSCREEN_NDC || Math.abs(ny) > OFFSCREEN_NDC) return null;
  return { x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height };
}
