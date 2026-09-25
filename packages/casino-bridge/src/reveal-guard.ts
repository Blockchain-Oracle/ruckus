import { REVEAL_WATCHDOG_MS } from './constants.ts';

export type RevealGuard = {
  /** Start the watchdog once a session settles; its presentation should call `reveal` before it fires. */
  arm(sessionId: string): void;
  /** Reveal now (idempotent). */
  reveal(sessionId: string): void;
  /** Reveal everything still pending, e.g. on unmount or game switch. */
  dispose(): void;
};

/**
 * Until `revealOutcome` is called the host hides winnings from its balance display, so a presentation
 * that crashes or is navigated away from must never strand them. Every armed session is revealed
 * exactly once: by the presentation, by the watchdog, or on dispose.
 */
export function createRevealGuard(
  revealOutcome: (sessionId: string) => Promise<void>,
  watchdogMs: number = REVEAL_WATCHDOG_MS,
): RevealGuard {
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  const revealed = new Set<string>();

  const reveal = (sessionId: string) => {
    if (revealed.has(sessionId)) return;
    revealed.add(sessionId);
    const timer = pending.get(sessionId);
    if (timer !== undefined) clearTimeout(timer);
    pending.delete(sessionId);
    void revealOutcome(sessionId).catch(() => {
      /* host may be gone; the balance guard is page-scoped anyway */
    });
  };

  return {
    arm(sessionId) {
      if (revealed.has(sessionId) || pending.has(sessionId)) return;
      pending.set(
        sessionId,
        setTimeout(() => reveal(sessionId), watchdogMs),
      );
    },
    reveal,
    dispose() {
      for (const sessionId of [...pending.keys()]) reveal(sessionId);
    },
  };
}
