import { IDLE, type Input } from './world.ts';

/**
 * A run is its seed plus its held inputs, tick by tick: the sim turns that back into the exact
 * same race (the replay can't lie; it is recomputed). Inputs change rarely, so the log is
 * run-length encoded: [ticks varint][input byte] pairs, a whole race in well under a kilobyte.
 */
const VERSION = 1;

export const packInput = (i: Input) => (i.h + 1) | (i.jump ? 4 : 0) | (i.duck ? 8 : 0);
export const unpackInput = (b: number): Input => ({
  h: ((b & 3) - 1) as Input['h'],
  jump: (b & 4) !== 0,
  duck: (b & 8) !== 0,
});

export type Recording = { seed: number; frames: Uint8Array };

function varint(out: number[], n: number) {
  let v = n >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

export function encodeRun({ seed, frames }: Recording): Uint8Array {
  const out: number[] = [VERSION];
  for (let k = 0; k < 4; k++) out.push((seed >>> (8 * k)) & 0xff);
  let i = 0;
  while (i < frames.length) {
    const b = frames[i] ?? 0;
    let n = 1;
    while (i + n < frames.length && frames[i + n] === b) n += 1;
    varint(out, n);
    out.push(b);
    i += n;
  }
  return Uint8Array.from(out);
}

/** Null for anything that isn't a well-formed run (links are user input). */
export function decodeRun(bytes: Uint8Array, maxFrames: number): Recording | null {
  if (bytes.length < 5 || bytes[0] !== VERSION) return null;
  const seed =
    ((bytes[1] ?? 0) |
      ((bytes[2] ?? 0) << 8) |
      ((bytes[3] ?? 0) << 16) |
      ((bytes[4] ?? 0) << 24)) >>>
    0;
  const frames: number[] = [];
  let p = 5;
  while (p < bytes.length) {
    let n = 0;
    let shift = 0;
    for (;;) {
      const b = bytes[p++];
      if (b === undefined || shift > 28) return null;
      n |= (b & 0x7f) << shift;
      if (b < 0x80) break;
      shift += 7;
    }
    const input = bytes[p++];
    // An over-long varint wraps negative: a run length must be a sane positive count.
    if (input === undefined || input > 15 || n < 1 || frames.length + n > maxFrames) return null;
    for (let k = 0; k < n; k++) frames.push(input);
  }
  return { seed, frames: Uint8Array.from(frames) };
}

/** The input a recording holds for a tick (idle once it runs out). */
export const recordedInput = (r: Recording, tick: number): Input => {
  const b = r.frames[tick];
  return b === undefined ? IDLE : unpackInput(b);
};
