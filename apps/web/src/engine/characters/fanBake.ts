import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  AnimationMixer,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  type MeshStandardMaterial,
  NearestFilter,
  RGBAFormat,
  type SkinnedMesh,
  type Texture,
  Vector3,
} from 'three/webgpu';

import fanGlb from '@/assets/models/chicken-fan.glb?url';

/** The stand's clips, in texture row order; moods pick among them (crowd.ts). */
export const FAN_CLIPS = ['idle', 'clapSit', 'cheer', 'dance'] as const;
export type FanClip = (typeof FAN_CLIPS)[number];
/** Frames sampled per clip: enough for a loop read from the stands, small enough to bake fast. */
export const FAN_FRAMES = 32;

export type FanBake = {
  /** Rest geometry (uv, index) with skinning stripped: the VAT supplies position and normal. */
  geometry: BufferGeometry;
  map: Texture | null;
  /** Rows = clip × frame, columns = vertex; xyz in the fan's own (1 m tall) space. */
  positions: DataTexture;
  normals: DataTexture;
  /** Seconds per clip, same order as FAN_CLIPS. */
  durations: number[];
  vertexCount: number;
};

let baking: Promise<FanBake> | null = null;

/**
 * Loads the fan and bakes its clips into vertex-animation textures on the CPU, once. Posing ~600
 * vertices through 128 frames is a few ms, and the bake can never drift from the shipped clips.
 */
export function bakeFan() {
  baking ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(fanGlb)
    .then((gltf) => {
      let mesh: SkinnedMesh | null = null;
      gltf.scene.traverse((o) => {
        if ((o as SkinnedMesh).isSkinnedMesh) mesh ??= o as SkinnedMesh;
      });
      const skinned = mesh as SkinnedMesh | null;
      if (!skinned) throw new Error('chicken-fan.glb has no skinned mesh');

      const src = skinned.geometry;
      const n = src.getAttribute('position').count;
      const rows = FAN_CLIPS.length * FAN_FRAMES;
      const pos = new Float32Array(n * rows * 4);
      const nrm = new Float32Array(n * rows * 4);
      const mixer = new AnimationMixer(gltf.scene);
      const scratch = new BufferGeometry();
      scratch.setIndex(src.getIndex());
      const posAttr = new BufferAttribute(new Float32Array(n * 3), 3);
      scratch.setAttribute('position', posAttr);
      const v = new Vector3();
      const durations: number[] = [];
      // The fan's own space: normalised to 1 m tall, feet at 0, like the cast.
      let scale = 1;
      let floor = 0;

      for (const [c, name] of FAN_CLIPS.entries()) {
        const clip = gltf.animations.find((a) => a.name === name);
        durations.push(clip?.duration ?? 1);
        mixer.stopAllAction();
        const action = clip ? mixer.clipAction(clip).play() : null;
        for (let f = 0; f < FAN_FRAMES; f++) {
          if (action && clip) mixer.setTime((clip.duration * f) / FAN_FRAMES);
          gltf.scene.updateMatrixWorld(true);
          skinned.skeleton.update();
          for (let i = 0; i < n; i++) {
            skinned.getVertexPosition(i, v);
            posAttr.setXYZ(i, v.x, v.y, v.z);
          }
          if (c === 0 && f === 0) {
            scratch.computeBoundingBox();
            const box = scratch.boundingBox;
            scale = box ? 1 / Math.max(1e-3, box.max.y - box.min.y) : 1;
            floor = box?.min.y ?? 0;
          }
          scratch.computeVertexNormals();
          const normals = scratch.getAttribute('normal');
          const row = c * FAN_FRAMES + f;
          for (let i = 0; i < n; i++) {
            const o = (row * n + i) * 4;
            pos[o] = posAttr.getX(i) * scale;
            pos[o + 1] = (posAttr.getY(i) - floor) * scale;
            pos[o + 2] = posAttr.getZ(i) * scale;
            nrm[o] = normals.getX(i);
            nrm[o + 1] = normals.getY(i);
            nrm[o + 2] = normals.getZ(i);
          }
        }
      }
      mixer.stopAllAction();

      const geometry = new BufferGeometry();
      geometry.setIndex(src.getIndex());
      geometry.setAttribute('position', src.getAttribute('position'));
      const uv = src.getAttribute('uv');
      if (uv) geometry.setAttribute('uv', uv);
      return {
        geometry,
        map: (skinned.material as MeshStandardMaterial).map,
        positions: dataTexture(pos, n, rows),
        normals: dataTexture(nrm, n, rows),
        durations,
        vertexCount: n,
      };
    });
  return baking;
}

function dataTexture(data: Float32Array, width: number, height: number) {
  const t = new DataTexture(data, width, height, RGBAFormat, FloatType);
  t.minFilter = NearestFilter;
  t.magFilter = NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
