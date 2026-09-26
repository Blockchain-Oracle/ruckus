import { ParticlePool } from '@arena/fx';
import {
  ALIVE_FLAG,
  FP_ONE,
  H,
  MAX_PICKUPS,
  MAX_PLAYERS,
  P,
  PK,
  PR,
  pickupBase,
  playerBase,
  projectileBase,
  WeaponId,
} from '@arena/sim-chickenz';

/**
 * Chickenz's particle and one-shot effects, triggered by diffing sim views (all in px, y down).
 * Numbers from `GameScene.ts:447-491, 1584-1690, 2122-2143`.
 */
const DEG = Math.PI / 180;
const DUST_CAPACITY = 256;
const BODY_W = 24;
const BODY_H = 32;
/** Phaser particle speeds are px/s; the pool integrates per second too. */
const DUST_LAND = {
  perSide: 5,
  jitter: 6,
  speedMin: 25,
  speedMax: 55,
  lifeMin: 0.35,
  lifeMax: 0.6,
  gravity: -5,
};
const DUST_JUMP = { perSide: 4, jitter: 4 };
const DUST_DOUBLE = {
  count: 12,
  spread: 12,
  speedMin: 20,
  speedMax: 60,
  angleMin: 200,
  angleMax: 340,
  gravity: 20,
};
const GLOW = {
  everyTicks: 8,
  jitter: 8,
  speedMin: 5,
  speedMax: 15,
  lifeMin: 0.6,
  lifeMax: 1,
  gravity: -10,
};
export const DUST_SCALE_START = 0.6;
export const EXPLOSION_FRAMES = 15;
export const COLLECTED_FRAMES = 6;
export const COLLECTED_OFFSET_Y = 20;
const MAX_EXPLOSIONS = 8;
const MAX_POPS = 4;

export type Burst = { x: number; y: number; age: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class ChickenzEffects {
  dust = new ParticlePool(DUST_CAPACITY);
  explosions: Burst[] = [];
  pops: Burst[] = [];

  private emit(
    x: number,
    y: number,
    angleDeg: number,
    speed: number,
    life: number,
    gravity: number,
  ) {
    // Screen y points down; the pool's y points up, so flip angle and gravity here.
    this.dust.burst({
      x,
      y: -y,
      count: 1,
      speed,
      angle: -angleDeg * DEG,
      spread: 0,
      lifeS: life,
      size: DUST_SCALE_START,
      gravity: -gravity,
      color: 0,
    });
  }

  private sideways(x: number, feet: number, perSide: number, jitter: number) {
    for (let i = 0; i < perSide; i++) {
      this.emit(
        x + rand(-jitter, jitter),
        feet,
        rand(160, 200),
        rand(DUST_LAND.speedMin, DUST_LAND.speedMax),
        rand(DUST_LAND.lifeMin, DUST_LAND.lifeMax),
        DUST_LAND.gravity,
      );
      this.emit(
        x + rand(-jitter, jitter),
        feet,
        rand(-20, 20),
        rand(DUST_LAND.speedMin, DUST_LAND.speedMax),
        rand(DUST_LAND.lifeMin, DUST_LAND.lifeMax),
        DUST_LAND.gravity,
      );
    }
  }

  ingest(prev: Int32Array, curr: Int32Array) {
    if ((curr[H.tick] ?? 0) <= (prev[H.tick] ?? 0)) return;
    const n = Math.min(curr[H.playerCount] ?? 0, MAX_PLAYERS);
    for (let slot = 0; slot < n; slot++) {
      const b = playerBase(slot);
      if (!((curr[b + P.flags] ?? 0) & ALIVE_FLAG)) continue;
      const x = (curr[b + P.x] ?? 0) / FP_ONE + BODY_W / 2;
      const feet = (curr[b + P.y] ?? 0) / FP_ONE + BODY_H;
      const grounded = curr[b + P.grounded] ?? 0;
      const wasGrounded = prev[b + P.grounded] ?? 0;
      const jumps = curr[b + P.jumpsLeft] ?? 0;
      const prevJumps = prev[b + P.jumpsLeft] ?? 0;
      if (grounded && !wasGrounded && (curr[b + P.stompingOn] ?? -1) < 0)
        this.sideways(x, feet, DUST_LAND.perSide, DUST_LAND.jitter);
      if (jumps < prevJumps) {
        if (wasGrounded) this.sideways(x, feet, DUST_JUMP.perSide, DUST_JUMP.jitter);
        else
          for (let i = 0; i < DUST_DOUBLE.count; i++)
            this.emit(
              x + rand(-DUST_DOUBLE.spread, DUST_DOUBLE.spread),
              feet - 4,
              rand(DUST_DOUBLE.angleMin, DUST_DOUBLE.angleMax),
              rand(DUST_DOUBLE.speedMin, DUST_DOUBLE.speedMax),
              rand(DUST_LAND.lifeMin, DUST_LAND.lifeMax),
              DUST_DOUBLE.gravity,
            );
      }
    }

    // Rockets that vanished burst into rings.
    const currIds = new Set<number>();
    for (let i = 0; i < (curr[H.projCount] ?? 0); i++)
      currIds.add(curr[projectileBase(i) + PR.id] ?? -1);
    for (let i = 0; i < (prev[H.projCount] ?? 0); i++) {
      const base = projectileBase(i);
      if (prev[base + PR.weapon] === WeaponId.Rocket && !currIds.has(prev[base + PR.id] ?? -1)) {
        this.explosions.push({
          x: (prev[base + PR.x] ?? 0) / FP_ONE,
          y: (prev[base + PR.y] ?? 0) / FP_ONE,
          age: 0,
        });
        if (this.explosions.length > MAX_EXPLOSIONS) this.explosions.shift();
      }
    }

    const tick = curr[H.tick] ?? 0;
    for (let i = 0; i < Math.min(curr[H.pickupCount] ?? 0, MAX_PICKUPS); i++) {
      const base = pickupBase(i);
      const x = (curr[base + PK.x] ?? 0) / FP_ONE;
      const y = (curr[base + PK.y] ?? 0) / FP_ONE;
      // Taken this tick: the "collected" pop where the gun was.
      if ((curr[base + PK.respawnTimer] ?? 0) > 0 && (prev[base + PK.respawnTimer] ?? 0) <= 0) {
        this.pops.push({ x, y: y + COLLECTED_OFFSET_Y, age: 0 });
        if (this.pops.length > MAX_POPS) this.pops.shift();
      }
      // Available guns shed a soft glow particle every few ticks.
      if (
        (curr[base + PK.respawnTimer] ?? 1) <= 0 &&
        tick % GLOW.everyTicks === i % GLOW.everyTicks
      ) {
        this.emit(
          x + rand(-GLOW.jitter, GLOW.jitter),
          y + rand(-GLOW.jitter, GLOW.jitter),
          rand(0, 360),
          rand(GLOW.speedMin, GLOW.speedMax),
          rand(GLOW.lifeMin, GLOW.lifeMax),
          GLOW.gravity,
        );
      }
    }
  }

  update(dtS: number, frameDt: number) {
    this.dust.update(dtS);
    for (const e of this.explosions) e.age += frameDt;
    for (const p of this.pops) p.age += frameDt;
    this.explosions = this.explosions.filter((e) => e.age < EXPLOSION_FRAMES);
    this.pops = this.pops.filter((p) => p.age < COLLECTED_FRAMES * 3);
  }

  clear() {
    this.dust = new ParticlePool(DUST_CAPACITY);
    this.explosions = [];
    this.pops = [];
  }
}
