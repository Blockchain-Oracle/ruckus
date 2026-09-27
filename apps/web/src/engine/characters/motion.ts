import { MathUtils, type Object3D, Quaternion, Vector3 } from 'three/webgpu';

/** Squash & stretch: a critically-soft spring on vertical scale, kicked by landings and hits. */
const SQUASH = { stiffness: 260, damping: 14, max: 0.45 } as const;
/** Lean eases toward its target so a sim's step changes never snap the body. */
const LEAN_RATE = 12;
/** Wing flap: shoulders swing up and down this far (rad) at this rate (Hz) at full strength. */
const FLAP = { rad: 0.9, hz: 7 } as const;

const SHOULDERS = ['LeftShoulder', 'RightShoulder'] as const;
const _q = new Quaternion();
const BODY_FORWARD = new Vector3(0, 0, 1);

/**
 * The layer on top of the clips: squash/stretch, lean and wing flap. It moves the model inside the
 * body's root (games own the root's transform) and adds to two shoulder bones after the mixer.
 */
export class ChickenMotion {
  private squash = 0;
  private squashV = 0;
  private lean = { x: 0, z: 0 };
  private flapT = 0;
  private readonly shoulders: {
    bone: Object3D;
    rest: Quaternion;
    axis: Vector3;
    side: number;
  }[] = [];

  private readonly model: Object3D;
  private readonly baseScale: number;

  constructor(model: Object3D, baseScale: number) {
    this.model = model;
    this.baseScale = baseScale;
    // The rig's bone axes are arbitrary (Mixamo-style, Y along the bone), so the flap axis is the
    // body's forward axis carried into each shoulder's local frame at rest.
    model.updateWorldMatrix(true, true);
    const inv = model.getWorldQuaternion(new Quaternion()).invert();
    for (const [i, name] of SHOULDERS.entries()) {
      const bone = model.getObjectByName(name);
      if (!bone) continue;
      const toBone = inv.clone().multiply(bone.getWorldQuaternion(new Quaternion())).invert();
      const axis = BODY_FORWARD.clone().applyQuaternion(toBone).normalize();
      this.shoulders.push({ bone, rest: bone.quaternion.clone(), axis, side: i ? -1 : 1 });
    }
  }

  /** +amount squashes (a landing), -amount stretches (a jump); the spring rings back to 1. */
  kick(amount: number) {
    this.squashV += amount * SQUASH.stiffness * 0.08;
  }

  /**
   * Before the mixer: shoulders go back to rest, since clips without a shoulder track would
   * otherwise keep last frame's flap and accumulate it.
   */
  beforeMixer() {
    for (const s of this.shoulders) s.bone.quaternion.copy(s.rest);
  }

  /** `lean` in rad (x forward, z sideways); `flap` 0..1. */
  afterMixer(dt: number, lean: { x: number; z: number }, flap: number) {
    const a = -SQUASH.stiffness * this.squash - SQUASH.damping * this.squashV;
    this.squashV += a * dt;
    this.squash = MathUtils.clamp(this.squash + this.squashV * dt, -SQUASH.max, SQUASH.max);
    // Volume-preserving: a squash flattens and widens.
    const y = 1 - this.squash;
    const xz = 1 / Math.sqrt(Math.max(0.2, y));
    this.model.scale.set(this.baseScale * xz, this.baseScale * y, this.baseScale * xz);

    const k = 1 - Math.exp(-LEAN_RATE * dt);
    this.lean.x += (lean.x - this.lean.x) * k;
    this.lean.z += (lean.z - this.lean.z) * k;
    this.model.rotation.set(this.lean.x, 0, this.lean.z);

    if (flap <= 0) return;
    this.flapT += dt;
    const swing = Math.sin(this.flapT * FLAP.hz * Math.PI * 2) * FLAP.rad * flap;
    for (const s of this.shoulders)
      s.bone.quaternion.multiply(_q.setFromAxisAngle(s.axis, swing * s.side));
  }
}
