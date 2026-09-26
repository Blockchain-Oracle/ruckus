import { noise1 } from './noise.ts';

/** Eiserloh trauma model (GDC 2016, "Math for Game Programmers: Juicing Your Cameras"). */
export const TRAUMA = {
  small: 0.15,
  shot: 0.3,
  explosion: 0.5,
  knockout: 0.9,
  decayPerS: 1.1,
  freqHz: 20,
  /** Squared so small hits barely move the camera and big ones really do. */
  exponent: 2,
  /** Reduced motion keeps a hint of impact rather than none. */
  reducedMotionScale: 0.2,
} as const;

export type ShakeSample = { x: number; y: number; angle: number };

export class Trauma {
  private value = 0;
  private time = 0;
  private readonly maxOffset: number;
  private readonly maxAngleRad: number;
  scale = 1;

  constructor(maxOffset: number, maxAngleRad: number) {
    this.maxOffset = maxOffset;
    this.maxAngleRad = maxAngleRad;
  }

  add(amount: number) {
    this.value = Math.min(1, this.value + amount);
  }

  get level() {
    return this.value;
  }

  /** Advance with the *render* clock (hit-stop freezes the world, not the shake). */
  update(dt: number, out: ShakeSample): ShakeSample {
    this.time += dt;
    const shake = this.value ** TRAUMA.exponent * this.scale;
    const t = this.time * TRAUMA.freqHz;
    out.x = this.maxOffset * shake * noise1(1, t);
    out.y = this.maxOffset * shake * noise1(2, t);
    out.angle = this.maxAngleRad * shake * noise1(3, t);
    this.value = Math.max(0, this.value - TRAUMA.decayPerS * dt);
    return out;
  }
}
