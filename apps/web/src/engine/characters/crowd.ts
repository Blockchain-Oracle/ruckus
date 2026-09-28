import {
  attribute,
  cos,
  Fn,
  float,
  floor,
  fract,
  hash,
  instanceIndex,
  ivec2,
  mix,
  normalLocal,
  select,
  sin,
  textureLoad,
  uniform,
  vec3,
  vertexIndex,
} from 'three/tsl';
import { Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh } from 'three/webgpu';

import { makeToonMaterial } from '../look/toon.ts';
import { bakeFan, FAN_FRAMES, type FanBake } from './fanBake.ts';

/** Where a fan sits: feet position, facing (rad about y, 0 = +z), and height in metres. */
export type Seat = { x: number; y: number; z: number; facing: number; heightM: number };
/** The stand's temperature: calm (idle, clapping), excited (cheering), party (dancing). */
export const MOODS = { calm: 0, excited: 1, party: 2 } as const;
export type Mood = keyof typeof MOODS;

/** Fans don't move in lockstep: each plays at its own pace within this spread. */
const SPEED_SPREAD = 0.3;
/** How fast the stand swings from one mood to the next (1/s). */
const MOOD_RATE = 4;

/**
 * A stand of chickens in one draw call. The fan's clips are baked into vertex-animation textures
 * (fanBake.ts); each instance picks a clip from the mood and its own seed, plays it at its own
 * phase and speed, and wears one of the given tints. Games place `mesh` and call `update(dt)`.
 */
export class ChickenCrowd {
  readonly mesh: Mesh;
  private readonly time = uniform(0);
  private readonly moodFrom = uniform(0);
  private readonly moodTo = uniform(0);
  private readonly moodMix = uniform(1);

  private constructor(bake: FanBake, seats: readonly Seat[], tints: readonly string[]) {
    const geometry = new InstancedBufferGeometry();
    geometry.index = bake.geometry.index;
    for (const [name, attr] of Object.entries(bake.geometry.attributes))
      geometry.setAttribute(name, attr);
    geometry.instanceCount = seats.length;
    const seat = new Float32Array(seats.length * 4);
    const size = new Float32Array(seats.length);
    const tint = new Float32Array(seats.length * 3);
    const c = new Color();
    for (const [i, s] of seats.entries()) {
      seat.set([s.x, s.y, s.z, s.facing], i * 4);
      size[i] = s.heightM;
      c.set(tints[i % tints.length] ?? '#ffffff');
      tint.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('fanSeat', new InstancedBufferAttribute(seat, 4));
    geometry.setAttribute('fanSize', new InstancedBufferAttribute(size, 1));
    geometry.setAttribute('fanTint', new InstancedBufferAttribute(tint, 3));

    const material = makeToonMaterial({
      map: bake.map,
      tintNode: attribute('fanTint', 'color'),
    });
    material.positionNode = this.vatPosition(bake);
    // toonOutlinePass re-draws toon materials with its own vertex shader, which knows nothing of
    // the VAT and would stamp one giant rest-pose fan at the origin. Fans read at stand distance
    // without an ink line, so the crowd opts out. Both flags: node materials inherit the classic
    // material's defaults, `isMeshToonMaterial` included, and the pass checks either.
    Object.assign(material, { isMeshToonNodeMaterial: false, isMeshToonMaterial: false });
    this.mesh = new Mesh(geometry, material);
    // One draw for the whole stand; its bounds are the stand's, not the rest mesh's.
    this.mesh.frustumCulled = false;
  }

  /** Bakes (once per session) and builds a stand. */
  static async create(seats: readonly Seat[], tints: readonly string[]) {
    return new ChickenCrowd(await bakeFan(), seats, tints);
  }

  setMood(mood: Mood) {
    const next = MOODS[mood];
    if (next === this.moodTo.value) return;
    this.moodFrom.value = this.moodTo.value;
    this.moodTo.value = next;
    this.moodMix.value = 0;
  }

  update(dt: number) {
    this.time.value += dt;
    this.moodMix.value = Math.min(1, this.moodMix.value + dt * MOOD_RATE);
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as { dispose(): void }).dispose();
  }

  /**
   * Per instance: a seed picks the clip for each mood (most of a calm stand idles, some clap; an
   * excited one cheers; a party dances), a second seed staggers phase and speed. Position and
   * normal are fetched from two neighbouring baked frames, blended, then placed on the seat.
   */
  private vatPosition(bake: FanBake) {
    const [d0 = 1, d1 = 1, d2 = 1, d3 = 1] = bake.durations;
    const { positions, normals } = bake;
    const time = this.time;
    const from = this.moodFrom;
    const to = this.moodTo;
    const blend = this.moodMix;
    return Fn(() => {
      const seed = hash(instanceIndex);
      const seed2 = hash(instanceIndex.add(7919));
      const clipOf = (mood: typeof from) =>
        select(
          mood.lessThan(0.5),
          select(seed.lessThan(0.6), float(0), float(1)),
          select(
            mood.lessThan(1.5),
            select(seed.lessThan(0.75), float(2), float(1)),
            select(seed.lessThan(0.6), float(3), float(2)),
          ),
        );
      const pace = float(1 - SPEED_SPREAD / 2).add(seed2.mul(SPEED_SPREAD));
      const sample = (clip: ReturnType<typeof clipOf>) => {
        // Four clips: a select chain, since an array index here compiles to f32 in WGSL.
        const dur = select(
          clip.lessThan(0.5),
          float(d0),
          select(clip.lessThan(1.5), float(d1), select(clip.lessThan(2.5), float(d2), float(d3))),
        );
        const u = fract(time.mul(pace).div(dur).add(seed2)).mul(FAN_FRAMES);
        const f0 = floor(u);
        const f1 = f0.add(1).mod(FAN_FRAMES);
        const t = fract(u);
        const row0 = clip.mul(FAN_FRAMES).add(f0).toInt();
        const row1 = clip.mul(FAN_FRAMES).add(f1).toInt();
        const at = (tex: typeof positions, row: typeof row0) =>
          textureLoad(tex, ivec2(vertexIndex.toInt(), row)).xyz;
        return {
          p: mix(at(positions, row0), at(positions, row1), t),
          n: mix(at(normals, row0), at(normals, row1), t),
        };
      };
      const a = sample(clipOf(from));
      const b = sample(clipOf(to));
      const p = mix(a.p, b.p, blend);
      const n = mix(a.n, b.n, blend).normalize();

      const seat = attribute('fanSeat', 'vec4');
      const size = attribute('fanSize', 'float');
      const cy = cos(seat.w);
      const sy = sin(seat.w);
      const turn = (v: typeof p) =>
        vec3(v.x.mul(cy).add(v.z.mul(sy)), v.y, v.z.mul(cy).sub(v.x.mul(sy)));
      normalLocal.assign(turn(n));
      return turn(p).mul(size).add(seat.xyz);
    })();
  }
}
