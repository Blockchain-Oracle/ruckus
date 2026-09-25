import { ParticlePool, TRAUMA, Trauma } from '@arena/fx';
import { GOAL_HEIGHT, HALF_WIDTH, type SimEvent, type World } from '@arena/sim-soccer';

import { KITS, PX } from '../config.ts';
import { POWER_LOOK } from './icons.ts';

/** Kick speed (px/s) that counts as a thumping hit (bigger puff, a little shake). */
const HARD_KICK = 850;
const SHAKE_MAX_OFFSET = 0.12;
const SHAKE_MAX_ANGLE = 0.012;
const CONFETTI = 150;
const hex = (c: string) => Number.parseInt(c.slice(1), 16);

/**
 * Presentation state that reacts to sim events: particles, stage shake, crowd excitement and the
 * net bulge. Render-only randomness comes from its own tiny PRNG, so looks are stable per session.
 */
export class SoccerFx {
  readonly puffs = new ParticlePool(96);
  readonly confetti = new ParticlePool(360);
  readonly trauma = new Trauma(SHAKE_MAX_OFFSET, SHAKE_MAX_ANGLE);
  /** 0..1: how loud the stands are (goals, near misses); decays by itself. */
  excitement = 0;
  /** Which team's end is celebrating (−1 none). */
  celebrating: -1 | 0 | 1 = -1;
  /** Net bulge per goal (left, right), 1 on a goal, easing to 0. */
  readonly net: [number, number] = [0, 0];
  private seed = 0x2545f491;

  private random = () => {
    this.seed = (this.seed + 0x6d2b79f5) >>> 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  ingest(events: readonly SimEvent[], w: World) {
    const bx = w.ball.x * PX;
    const by = w.ball.y * PX;
    for (const e of events) {
      if (e.kind === 'kick') {
        const hard = e.speed > HARD_KICK;
        this.puffs.burst(
          {
            x: bx,
            y: by,
            count: hard ? 12 : 6,
            speed: hard ? 3.2 : 1.8,
            angle: 0,
            spread: Math.PI * 2,
            lifeS: 0.35,
            size: hard ? 0.13 : 0.09,
            gravity: 0,
            color: 0xfff6e0,
          },
          this.random,
        );
        if (hard) this.trauma.add(TRAUMA.small);
      } else if (e.kind === 'post') {
        this.puffs.burst(
          {
            x: bx,
            y: by,
            count: 10,
            speed: 3,
            angle: Math.PI / 2,
            spread: Math.PI * 1.6,
            lifeS: 0.3,
            size: 0.07,
            gravity: 6,
            color: 0xffe28a,
          },
          this.random,
        );
        this.trauma.add(TRAUMA.shot);
        this.excitement = Math.max(this.excitement, 0.6);
      } else if (e.kind === 'powerup') {
        const tone = hex(POWER_LOOK[e.power].tone);
        this.puffs.burst(
          {
            x: bx,
            y: by,
            count: 18,
            speed: 3.6,
            angle: 0,
            spread: Math.PI * 2,
            lifeS: 0.45,
            size: 0.1,
            gravity: 0,
            color: tone,
          },
          this.random,
        );
      } else if (e.kind === 'goal') {
        const side = e.team === 0 ? 1 : 0;
        this.net[side] = 1;
        this.celebrating = e.team;
        this.excitement = 1;
        this.trauma.add(TRAUMA.explosion);
        const kit = KITS[e.team];
        const x = (side === 1 ? 1 : -1) * (HALF_WIDTH - 60) * PX;
        for (const color of [kit.body, kit.partner, '#fff1d6', '#ffc23a']) {
          this.confetti.burst(
            {
              x,
              y: GOAL_HEIGHT * PX,
              count: CONFETTI / 4,
              speed: 7,
              angle: side === 1 ? Math.PI * 0.62 : Math.PI * 0.38,
              spread: Math.PI * 0.55,
              lifeS: 2.6,
              size: 0.07,
              gravity: 5,
              color: hex(color),
            },
            this.random,
          );
        }
      }
    }
  }

  update(dt: number) {
    this.puffs.update(dt);
    this.confetti.update(dt);
    // Confetti flutters: air drag caps its fall so it drifts down instead of dropping.
    const c = this.confetti;
    for (let i = 0; i < c.capacity; i++) {
      if ((c.life[i] ?? 0) <= 0) continue;
      c.vx[i] = (c.vx[i] ?? 0) * (1 - 1.6 * dt);
      if ((c.vy[i] ?? 0) < -1.1) c.vy[i] = -1.1;
    }
    this.excitement = Math.max(0, this.excitement - dt * 0.28);
    if (this.excitement < 0.2) this.celebrating = -1;
    this.net[0] = Math.max(0, this.net[0] - dt * 1.4);
    this.net[1] = Math.max(0, this.net[1] - dt * 1.4);
  }

  clear() {
    this.puffs.life.fill(0);
    this.confetti.life.fill(0);
    this.excitement = 0;
    this.celebrating = -1;
  }
}
