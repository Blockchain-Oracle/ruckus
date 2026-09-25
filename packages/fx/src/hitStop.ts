/** Hit-stop durations in ms (research §1.2): light 2–4 frames, heavy 6–10, match-deciding longer. */
export const HIT_STOP_MS = { light: 50, heavy: 130, decisive: 220 } as const;
/** After a freeze the render clock catches up at this rate so interpolation doesn't lag the sim. */
const CATCH_UP_RATE = 1.4;

/**
 * A render-only clock. Freezing it pauses interpolation and animation while the fixed-tick sim keeps
 * running untouched (replays and netcode must never see a stall). Owed time is repaid at 1.4×.
 */
export class HitStopClock {
  private frozenMs = 0;
  private owedS = 0;
  timeScale = 1;

  freeze(ms: number) {
    this.frozenMs = Math.max(this.frozenMs, ms);
  }

  /** Returns the dt the renderer should animate with this frame. */
  tick(realDtS: number): number {
    if (this.frozenMs > 0) {
      this.frozenMs -= realDtS * 1000;
      this.owedS += realDtS;
      return 0;
    }
    const scaled = realDtS * this.timeScale;
    if (this.owedS <= 0) return scaled;
    const extra = Math.min(this.owedS, scaled * (CATCH_UP_RATE - 1));
    this.owedS -= extra;
    return scaled + extra;
  }

  get frozen() {
    return this.frozenMs > 0;
  }
}
