/**
 * Struct-of-arrays particle pool: no per-particle objects, no GC churn, and the arrays map straight
 * onto one InstancedMesh per effect type. Rendering is the caller's job; this is just the physics.
 */
export type BurstSpec = {
  x: number;
  y: number;
  count: number;
  speed: number;
  /** Radians; spread around `angle`. Full circle = Math.PI * 2. */
  angle: number;
  spread: number;
  lifeS: number;
  size: number;
  gravity: number;
  color: number;
};

export class ParticlePool {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly size: Float32Array;
  readonly gravity: Float32Array;
  readonly color: Uint32Array;
  readonly capacity: number;
  private cursor = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.color = new Uint32Array(capacity);
  }

  /** Ring allocation: when full, the oldest particle is recycled (it was about to die anyway). */
  burst(spec: BurstSpec, random: () => number = Math.random) {
    for (let n = 0; n < spec.count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const a = spec.angle + (random() - 0.5) * spec.spread;
      const v = spec.speed * (0.5 + random() * 0.5);
      this.x[i] = spec.x;
      this.y[i] = spec.y;
      this.vx[i] = Math.cos(a) * v;
      this.vy[i] = Math.sin(a) * v;
      const life = spec.lifeS * (0.7 + random() * 0.3);
      this.life[i] = life;
      this.maxLife[i] = life;
      this.size[i] = spec.size;
      this.gravity[i] = spec.gravity;
      this.color[i] = spec.color;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.capacity; i++) {
      const life = this.life[i] ?? 0;
      if (life <= 0) continue;
      this.life[i] = life - dt;
      this.vy[i] = (this.vy[i] ?? 0) - (this.gravity[i] ?? 0) * dt;
      this.x[i] = (this.x[i] ?? 0) + (this.vx[i] ?? 0) * dt;
      this.y[i] = (this.y[i] ?? 0) + (this.vy[i] ?? 0) * dt;
    }
  }

  /** 1 → 0 over the particle's life, ease-out so particles shrink fast then linger. */
  fade(i: number): number {
    const max = this.maxLife[i] ?? 0;
    if (max <= 0) return 0;
    const t = Math.max(0, (this.life[i] ?? 0) / max);
    return 1 - (1 - t) ** 2;
  }
}
