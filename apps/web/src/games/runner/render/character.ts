import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  AdditiveBlending,
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  Box3,
  Color,
  LoopOnce,
  LoopRepeat,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  NormalBlending,
  type Object3D,
  Vector3,
} from 'three/webgpu';

import runnerGlb from '../assets/models/runner.glb?url';
import { GHOST_OPACITY, RUNNER_HEIGHT_VISUAL_M } from '../config.ts';

/** Clip names baked by `packages/assets-pipeline/src/runner-character.ts`. */
export type Clip =
  | 'idle'
  | 'run'
  | 'jumpStart'
  | 'jumpAir'
  | 'jumpLand'
  | 'roll'
  | 'hit'
  | 'knockback'
  | 'wipeout'
  | 'dance'
  | 'cheer'
  | 'slideStart'
  | 'slide'
  | 'slideExit';

type Loaded = { scene: Object3D; clips: AnimationClip[]; scale: number };
let loading: Promise<Loaded> | null = null;
let loaded: Loaded | null = null;

/** Quaternius's CC0 mannequin (docs/CREDITS.md), loaded once and cloned per runner. */
export function loadRunnerCharacter() {
  loading ??= new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(runnerGlb)
    .then((gltf) => {
      const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
      loaded = {
        scene: gltf.scene,
        clips: gltf.animations,
        scale: RUNNER_HEIGHT_VISUAL_M / Math.max(0.01, size.y),
      };
      return loaded;
    });
  return loading;
}

/** Clips that play once and hold their last frame (the rest loop). */
const ONCE = new Set<Clip>([
  'jumpStart',
  'jumpLand',
  'roll',
  'hit',
  'knockback',
  'wipeout',
  'cheer',
  'slideStart',
  'slideExit',
]);
const FADE_S = 0.12;

/**
 * One runner's body: a clone of the mannequin with its own materials (slot colour, ghost or
 * solid) and mixer. `play` crossfades to a clip; the scene decides which one from sim state.
 */
export class RunnerBody {
  readonly root: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<Clip, AnimationAction>();
  private current: Clip | null = null;
  private readonly main: MeshStandardMaterial;
  private readonly joints: MeshStandardMaterial;
  private ghost: boolean | null = null;

  constructor(color: string) {
    if (!loaded) throw new Error('runner character not loaded');
    this.root = clone(loaded.scene);
    this.root.scale.setScalar(loaded.scale);
    // The mannequin faces +z; the race runs toward −z.
    this.root.rotation.y = Math.PI;
    const tone = new Color(color);
    this.main = new MeshStandardMaterial({
      color: tone,
      emissive: tone,
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.15,
    });
    this.joints = new MeshStandardMaterial({ color: '#1b1024', roughness: 0.6, metalness: 0.3 });
    this.root.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      const name = (m.material as Material).name;
      m.material = name === 'M_Joints' ? this.joints : this.main;
    });
    this.mixer = new AnimationMixer(this.root);
    for (const clip of loaded.clips) {
      const a = this.mixer.clipAction(clip);
      const name = clip.name as Clip;
      if (ONCE.has(name)) {
        a.setLoop(LoopOnce, 1);
        a.clampWhenFinished = true;
      } else a.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
      this.actions.set(name, a);
    }
    this.play('idle');
  }

  /** Ghosts are see-through and never write depth, so they never hide the road from you. */
  setGhost(ghost: boolean) {
    if (ghost === this.ghost) return;
    this.ghost = ghost;
    for (const m of [this.main, this.joints]) {
      m.transparent = ghost;
      m.opacity = ghost ? GHOST_OPACITY : 1;
      m.depthWrite = !ghost;
      // Additive reads as a hologram: bright where bodies overlap, the road visible through them.
      m.blending = ghost ? AdditiveBlending : NormalBlending;
      // Transparency changes the pipeline, so the material recompiles (only on a change).
      m.needsUpdate = true;
    }
    this.main.emissiveIntensity = ghost ? 0.9 : 0.18;
  }

  /** A ghost's strength (0..1 of its full opacity): it fades as it comes near you. */
  setGhostFade(fade: number) {
    if (!this.ghost) return;
    this.main.opacity = this.joints.opacity = GHOST_OPACITY * fade;
  }

  play(clip: Clip, timeScale = 1) {
    const next = this.actions.get(clip);
    if (!next) return;
    next.timeScale = timeScale;
    if (this.current === clip) return;
    const prev = this.current ? this.actions.get(this.current) : null;
    next.reset().play();
    if (prev) next.crossFadeFrom(prev, FADE_S, false);
    this.current = clip;
  }

  get clip() {
    return this.current;
  }

  /** True once a play-once clip has run to its end. */
  done() {
    const a = this.current ? this.actions.get(this.current) : null;
    return !a?.isRunning();
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  /**
   * Stops the clips and frees GPU memory. StrictMode remounts reuse the same memoized body, so it
   * must come back to life: forgetting the current clip makes the next `play` start it again.
   */
  dispose() {
    this.mixer.stopAllAction();
    this.current = null;
    this.main.dispose();
    this.joints.dispose();
  }
}
