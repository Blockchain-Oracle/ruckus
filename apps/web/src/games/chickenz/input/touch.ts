import { Button } from '@arena/sim-chickenz';

/**
 * Chickenz's virtual controls (`apps/client/src/input/TouchControls.ts`), logic only:
 * a fixed joystick (up = jump, sideways = run, tap = taunt, spin = shake off a stomp) and a
 * shoot button. The DOM layer feeds pointer positions in; the input manager reads buttons out.
 */
export const JOYSTICK = {
  radius: 65,
  knobRadius: 28,
  deadZone: 0.18,
  baseInset: 110,
} as const;
/** Jump is held 47 of every 50 frames so the sim sees fresh rising edges for re-jumps. */
const JUMP_CYCLE = 50;
const JUMP_HELD = 47;
const JUMP_UP_THRESHOLD = -0.2;
const RUN_THRESHOLD = 0.3;
/** Spin detection: angular speed EMA over this threshold starts ~25 frames of L/R shaking. */
const SPIN_MIN_NORM = 0.35;
const SPIN_EMA = 0.3;
const SPIN_DECAY = 0.85;
const SPIN_TRIGGER = 0.12;
const SHAKE_FRAMES = 25;
const SHAKE_PERIOD = 6;
const TAP_MAX_MS = 250;
const TAP_MOVE_FACTOR = 1.5;
const TAUNT_HOLD_MS = 150;

export class TouchSticks {
  active = false;
  joystick = false;
  knobX = 0;
  knobY = 0;
  shoot = false;
  shaking = 0;
  private startedAt = 0;
  private taunting = false;
  private tauntTimer = 0;
  private jumpFrames = 0;
  private lastAngle = 0;
  private angularSpeed = 0;
  private shakeFrame = 0;

  begin(now: number) {
    this.joystick = true;
    this.knobX = 0;
    this.knobY = 0;
    this.startedAt = now;
    this.taunting = false;
  }

  move(dx: number, dy: number) {
    const dist = Math.hypot(dx, dy);
    const scale = dist > JOYSTICK.radius ? JOYSTICK.radius / dist : 1;
    this.knobX = dx * scale;
    this.knobY = dy * scale;
  }

  end(now: number) {
    const moved = Math.hypot(this.knobX, this.knobY);
    if (
      moved < JOYSTICK.radius * JOYSTICK.deadZone * TAP_MOVE_FACTOR &&
      now - this.startedAt < TAP_MAX_MS
    ) {
      this.taunting = true;
      window.clearTimeout(this.tauntTimer);
      this.tauntTimer = window.setTimeout(() => {
        this.taunting = false;
      }, TAUNT_HOLD_MS);
    }
    this.joystick = false;
    this.knobX = 0;
    this.knobY = 0;
    this.jumpFrames = 0;
    this.angularSpeed = 0;
    this.shaking = 0;
    this.shakeFrame = 0;
  }

  /** Called once per sim tick. */
  buttons(): number {
    if (!this.active) return 0;
    let buttons = this.shoot ? Button.Shoot : 0;
    if (this.taunting) return buttons | Button.Taunt;
    if (!this.joystick) return buttons;
    const dist = Math.hypot(this.knobX, this.knobY);
    const norm = dist / JOYSTICK.radius;
    const angle = Math.atan2(this.knobY, this.knobX);
    if (norm > SPIN_MIN_NORM) {
      let delta = angle - this.lastAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      this.angularSpeed = (1 - SPIN_EMA) * this.angularSpeed + SPIN_EMA * Math.abs(delta);
      if (this.angularSpeed > SPIN_TRIGGER) this.shaking = SHAKE_FRAMES;
    } else {
      this.angularSpeed *= SPIN_DECAY;
    }
    this.lastAngle = angle;

    if (this.shaking > 0) {
      this.shaking -= 1;
      this.shakeFrame += 1;
      return (
        buttons | (this.shakeFrame % SHAKE_PERIOD < SHAKE_PERIOD / 2 ? Button.Left : Button.Right)
      );
    }
    if (norm <= JOYSTICK.deadZone) return buttons;
    const nx = this.knobX / dist;
    const ny = this.knobY / dist;
    if (ny < JUMP_UP_THRESHOLD) {
      this.jumpFrames += 1;
      if (this.jumpFrames % JUMP_CYCLE < JUMP_HELD) buttons |= Button.Jump;
    } else {
      this.jumpFrames = 0;
    }
    if (nx > RUN_THRESHOLD) buttons |= Button.Right;
    if (nx < -RUN_THRESHOLD) buttons |= Button.Left;
    return buttons;
  }

  aimX(): -1 | 0 | 1 {
    if (
      !this.active ||
      !this.joystick ||
      Math.abs(this.knobX) / JOYSTICK.radius < JOYSTICK.deadZone
    )
      return 0;
    return this.knobX > 0 ? 1 : -1;
  }
}
