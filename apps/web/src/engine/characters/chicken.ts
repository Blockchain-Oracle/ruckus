import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  type Bone,
  Box3,
  Group,
  LoopOnce,
  LoopRepeat,
  Matrix4,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  type SkinnedMesh,
  type Texture,
  Vector3,
} from 'three/webgpu';

import chickenGlb from '@/assets/models/chicken.glb?url';

import { makeToonMaterial } from '../look/toon.ts';
import { ChickenMotion } from './motion.ts';

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

/** How a prop sits on its bone, in body space (metres, x right, y up, z forward). */
export type SocketFit = {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  /**
   * `rigid` rides the bone fully (boots, hats). `position` follows only where the bone is and keeps
   * body orientation, so the game aims it (a gun, a cue) without the wrist's wobble.
   */
  follow?: 'rigid' | 'position';
};

const _s = new Vector3();
const _p = new Vector3();

/**
 * One chicken: a skeleton-correct clone, its own tinted toon material, and a mixer that crossfades
 * between clips, with the motion layer on top. Games place `root` and drive verbs from sim state;
 * they never touch the mixer or the bones.
 */
export class ChickenBody {
  /** Games own this transform (position, facing). */
  readonly root = new Group();
  private readonly model: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<ChickenClip, AnimationAction>();
  private readonly material: ReturnType<typeof makeToonMaterial>;
  private readonly motion: ChickenMotion;
  private current: ChickenClip | null = null;
  private lean = { x: 0, z: 0 };
  private flap = 0;
  private readonly followers: { bone: Object3D; prop: Object3D; offset: Vector3 }[] = [];

  /** `heightM` is the rendered height in world units (the source rig is ~1 m tall). */
  constructor(color: string, heightM = 1) {
    if (!loaded) throw new Error('chicken not loaded: await loadChicken() first');
    this.model = clone(loaded.scene);
    const scale = heightM / Math.max(0.01, loaded.height);
    this.model.scale.setScalar(scale);
    this.root.add(this.model);
    this.material = makeToonMaterial({ map: loaded.map, tint: color });
    this.model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      // Skinned bounds follow the bind pose, not the animation; culling them pops limbs away.
      mesh.frustumCulled = false;
      mesh.material = this.material;
    });
    this.motion = new ChickenMotion(this.model, scale);
    this.mixer = new AnimationMixer(this.model);
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

  get clip() {
    return this.current;
  }

  /** Landing (+) or take-off (−) squash; the body springs back on its own. */
  squash(amount: number) {
    this.motion.kick(amount);
  }

  /** Target lean in rad: x tips forward (running), z sideways (strafing, knocked). */
  setLean(x: number, z = 0) {
    this.lean.x = x;
    this.lean.z = z;
  }

  /** Wing flap strength 0..1 (airborne, celebrating). */
  setFlap(amount: number) {
    this.flap = amount;
  }

  setColor(color: string) {
    this.material.tint.value.set(color);
  }

  /**
   * Hangs `prop` from a bone. Rigid props go through an anchor that cancels the bone's bind-pose
   * rotation and scale, so `fit` is authored in body space (metres, x right, y up, z forward)
   * whatever the rig's axes. Returns the object to remove to detach.
   */
  attach(bone: ChickenSocket, prop: Object3D, fit: SocketFit = {}) {
    const b = this.model.getObjectByName(bone);
    if (!b) return undefined;
    if (fit.rotation) prop.rotation.set(...fit.rotation);
    if (fit.follow === 'position') {
      this.followers.push({ bone: b, prop, offset: new Vector3(...(fit.position ?? [0, 0, 0])) });
      this.root.add(prop);
      return prop;
    }
    if (fit.position) prop.position.set(...fit.position);
    this.model.updateWorldMatrix(true, true);
    const anchor = new Group();
    anchor.quaternion.copy(this.bindQuaternion(b).invert());
    b.getWorldScale(_s);
    const rootScale = this.root.getWorldScale(new Vector3());
    anchor.scale.set(rootScale.x / _s.x, rootScale.y / _s.y, rootScale.z / _s.z);
    anchor.add(prop);
    b.add(anchor);
    return anchor;
  }

  /** The bone's rotation relative to the model in the bind pose (independent of the current clip). */
  private bindQuaternion(bone: Object3D) {
    let skinned: SkinnedMesh | null = null;
    this.model.traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) skinned ??= o as SkinnedMesh;
    });
    const mesh = skinned as SkinnedMesh | null;
    const i = mesh ? mesh.skeleton.bones.indexOf(bone as Bone) : -1;
    const inverse = mesh && i >= 0 ? mesh.skeleton.boneInverses[i] : undefined;
    if (!mesh || !inverse) return bone.getWorldQuaternion(new Quaternion());
    const bind = new Quaternion();
    new Matrix4().copy(inverse).invert().decompose(new Vector3(), bind, new Vector3());
    // Bind matrices live in the skinned mesh's space; carry them into the model's.
    const meshToModel = this.model
      .getWorldQuaternion(new Quaternion())
      .invert()
      .multiply(mesh.getWorldQuaternion(new Quaternion()));
    return meshToModel.multiply(bind);
  }

  update(dt: number) {
    this.motion.beforeMixer();
    this.mixer.update(dt);
    this.motion.afterMixer(dt, this.lean, this.flap);
    if (!this.followers.length) return;
    this.root.updateWorldMatrix(true, true);
    for (const f of this.followers) {
      f.bone.getWorldPosition(_p);
      f.prop.position.copy(this.root.worldToLocal(_p)).add(f.offset);
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.material.dispose();
  }
}
