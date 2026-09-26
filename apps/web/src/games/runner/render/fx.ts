import { TRAUMA, Trauma } from '@arena/fx';
import { BARRIERS, PICKUPS, type SimEvent, type World } from '@arena/sim-runner';

import { SLOTS, VERB_COLORS } from '../config.ts';
import { PICKUP_LOOK } from './textures.ts';

const hex = (c: string) => Number.parseInt(c.slice(1), 16);
const SHAKE_MAX_OFFSET = 0.35;
const SHAKE_MAX_ANGLE = 0.02;

/**
 * A 3D particle pool anchored to the course: positions are (x, y, s), so sparks from a hit stay on
 * the road where they happened as everyone runs on past them.
 */
export class Particles3 {
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly s: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly vs: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly size: Float32Array;
  readonly gravity: Float32Array;
  readonly color: Uint32Array;
  readonly capacity: number;
  private next = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    const f = () => new Float32Array(capacity);
    this.x = f();
    this.y = f();
    this.s = f();
    this.vx = f();
    this.vy = f();
    this.vs = f();
    this.life = f();
    this.maxLife = f();
    this.size = f();
    this.gravity = f();
    this.color = new Uint32Array(capacity);
  }

  emit(
    at: { x: number; y: number; s: number },
    v: { x: number; y: number; s: number },
    lifeS: number,
    size: number,
    gravity: number,
    color: number,
  ) {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.x[i] = at.x;
    this.y[i] = at.y;
    this.s[i] = at.s;
    this.vx[i] = v.x;
    this.vy[i] = v.y;
    this.vs[i] = v.s;
    this.life[i] = this.maxLife[i] = lifeS;
    this.size[i] = size;
    this.gravity[i] = gravity;
    this.color[i] = color;
  }

  update(dt: number) {
    for (let i = 0; i < this.capacity; i++) {
      const life = this.life[i] ?? 0;
      if (life <= 0) continue;
      this.life[i] = life - dt;
      this.vy[i] = (this.vy[i] ?? 0) - (this.gravity[i] ?? 0) * dt;
      this.x[i] = (this.x[i] ?? 0) + (this.vx[i] ?? 0) * dt;
      this.y[i] = Math.max(0.02, (this.y[i] ?? 0) + (this.vy[i] ?? 0) * dt);
      this.s[i] = (this.s[i] ?? 0) + (this.vs[i] ?? 0) * dt;
    }
  }

  /** 1 at birth → 0 at death. */
  fade(i: number) {
    return (this.life[i] ?? 0) / (this.maxLife[i] || 1);
  }

  clear() {
    this.life.fill(0);
  }
}

/**
 * Presentation that reacts to the focus runner's events: sparks, coin glints, shake, the red hit
 * flash and the pickup banner. Other runners' events stay quiet (their ghosts only flicker).
 */
export class RunnerFx {
  readonly sparks = new Particles3(260);
  readonly trauma = new Trauma(SHAKE_MAX_OFFSET, SHAKE_MAX_ANGLE);
  /** 0..1 red vignette after a hit; the shield's flash is teal. */
  hitFlash = 0;
  shieldFlash = 0;
  /** Seconds since the last coin (drives the coin counter's pop). */
  coinPop = 0;
  private seed = 0x51f15e;

  private random = () => {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  private burst(
    at: { x: number; y: number; s: number },
    count: number,
    speed: number,
    color: number,
    opts: { life?: number; size?: number; gravity?: number; carry?: number } = {},
  ) {
    const r = this.random;
    for (let k = 0; k < count; k++) {
      const a = r() * Math.PI * 2;
      const up = r();
      this.sparks.emit(
        at,
        {
          x: Math.cos(a) * speed * (0.4 + r() * 0.6),
          y: up * speed,
          s: Math.sin(a) * speed * 0.6 + (opts.carry ?? 0),
        },
        (opts.life ?? 0.45) * (0.6 + r() * 0.6),
        (opts.size ?? 0.07) * (0.6 + r() * 0.8),
        opts.gravity ?? 9,
        color,
      );
    }
  }

  ingest(events: readonly SimEvent[], w: World, focus: number, xOf: (i: number) => number) {
    for (const e of events) {
      if (!('runner' in e) || e.runner !== focus) continue;
      const r = w.runners[focus];
      if (!r) continue;
      const at = { x: xOf(focus), y: r.y + 0.7, s: r.s + 0.4 };
      switch (e.kind) {
        case 'coin': {
          const c = w.course[e.entity];
          const cAt = c && c.kind === 'coin' ? { x: at.x, y: c.y, s: c.s } : at;
          this.burst(cAt, 7, 2.2, 0xffd76a, {
            life: 0.35,
            size: 0.05,
            gravity: 2,
            carry: r.s > 0 ? 8 : 0,
          });
          this.coinPop = 0;
          break;
        }
        case 'hit':
          if (e.shielded) {
            this.shieldFlash = 1;
            this.burst(at, 26, 5, 0x5ee06a, { size: 0.08 });
            this.trauma.add(TRAUMA.small);
          } else {
            const b = w.course[e.entity];
            const tone =
              b && b.kind === 'barrier' ? hex(VERB_COLORS[BARRIERS[b.barrier].verb]) : 0xffffff;
            this.hitFlash = 1;
            this.burst(at, 34, 6, tone, { size: 0.09 });
            this.trauma.add(TRAUMA.shot);
          }
          break;
        case 'wipeout':
          this.hitFlash = 1;
          this.burst(at, 70, 8, 0xff2244, { size: 0.1, life: 0.8 });
          this.trauma.add(TRAUMA.knockout);
          break;
        case 'pickup':
          this.burst(at, 30, 4.5, hex(PICKUP_LOOK[e.pickup].tone), {
            size: 0.08,
            gravity: PICKUPS[e.pickup].good ? -2 : 6,
          });
          break;
        case 'land':
          if (e.speed > 9) {
            this.burst({ ...at, y: r.y + 0.05 }, 10, 2.4, 0x9aa6c8, { size: 0.06, gravity: 4 });
            if (e.speed > 16) this.trauma.add(TRAUMA.small);
          }
          break;
        case 'finish':
          for (const s of SLOTS)
            this.burst({ ...at, y: 2.5 }, 30, 7, hex(s.color), { life: 1.4, gravity: 5 });
          break;
      }
    }
  }

  update(dt: number) {
    this.sparks.update(dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 2.5);
    this.coinPop += dt;
  }

  clear() {
    this.sparks.clear();
    this.hitFlash = this.shieldFlash = 0;
  }
}
