import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  Box3,
  LoopOnce,
  LoopRepeat,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
  Vector3,
} from 'three/webgpu';

import chickenGlb from '@/assets/models/chicken.glb?url';

import { makeToonMaterial } from '../look/toon.ts';

/** Clips baked by `packages/assets-pipeline/src/chicken-character.ts` (Meshy Pro rig, ADR-008). */
export type ChickenClip =
  | 'idle'
  | 'idleAlt'
  | 'walk'
  | 'jog'
  | 'run'
  | 'jump'
  | 'runJump'
  | 'fall'
  | 'hit'
  | 'ko'
  | 'dead'
  | 'shoot'
  | 'walkShoot'
  | 'kick'
  | 'slide'
  | 'win'
  | 'winAlt'
  | 'lose'
  | 'taunt'
  | 'cheer'
  | 'clapSit'
  | 'dance';

/** Bones props hang from (gun, cue, boots). */
export type ChickenSocket = 'RightHand' | 'LeftHand' | 'Head' | 'LeftFoot' | 'RightFoot';

/** One-shots hold their last frame; everything else loops. */
const ONCE = new Set<ChickenClip>([
  'jump',
  'runJump',
  'hit',
  'ko',
  'dead',
  'kick',
  'slide',
  'lose',
  'taunt',
]);
const FADE_S = 0.14;

type Loaded = { scene: Object3D; clips: AnimationClip[]; map: Texture | null; height: number };
let loading: Promise<Loaded> | null = null;
let loaded: Loaded | null = null;

/** Loads the chicken once; every player clones it. */
export function loadChicken() {
  loading ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(chickenGlb)
    .then((gltf) => {
      let map: Texture | null = null;
      gltf.scene.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) map ??= (mesh.material as MeshStandardMaterial).map;
      });
      const height = new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y;
      loaded = { scene: gltf.scene, clips: gltf.animations, map, height };
      return loaded;
    });
  return loading;
}

/**
 * One chicken: a skeleton-correct clone, its own tinted toon material, and a mixer that crossfades
 * between clips. Games drive `play()` from sim state; they never touch the mixer directly.
 */
export class ChickenBody {
  readonly root: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<ChickenClip, AnimationAction>();
  private readonly material: ReturnType<typeof makeToonMaterial>;
  private current: ChickenClip | null = null;

  /** `heightM` is the rendered height in world units (the source rig is ~1 m tall). */
  constructor(color: string, heightM = 1) {
    if (!loaded) throw new Error('chicken not loaded: await loadChicken() first');
    this.root = clone(loaded.scene);
    this.root.scale.multiplyScalar(heightM / Math.max(0.01, loaded.height));
    this.material = makeToonMaterial({ map: loaded.map, tint: color });
    this.root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      // Skinned bounds follow the bind pose, not the animation; culling them pops limbs away.
      mesh.frustumCulled = false;
      mesh.material = this.material;
    });
    this.mixer = new AnimationMixer(this.root);
    for (const clip of loaded.clips) {
      const name = clip.name as ChickenClip;
      const action = this.mixer.clipAction(clip);
      if (ONCE.has(name)) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      } else action.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
      this.actions.set(name, action);
    }
    this.play('idle');
  }

  /** Crossfades to `clip`; replaying the current one-shot restarts it. */
  play(clip: ChickenClip, { restart = false, speed = 1 } = {}) {
    const next = this.actions.get(clip);
    if (!next) return;
    next.timeScale = speed;
    if (clip === this.current && !restart) return;
    const prev = this.current ? this.actions.get(this.current) : undefined;
    next.reset().play();
    if (prev && prev !== next) next.crossFadeFrom(prev, FADE_S, false);
    this.current = clip;
  }

  setColor(color: string) {
    this.material.tint.value.set(color);
  }

  /** The bone a prop attaches to. */
  socket(bone: ChickenSocket): Object3D | undefined {
    return this.root.getObjectByName(bone);
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.material.dispose();
  }
}
