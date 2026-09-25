/** Wager presentation timing (game-feel-audio-ux.md §5). */

/** Even an instant VRF answer gets this much drumroll; instant results feel cheap and untrustworthy. */
export const MIN_SUSPENSE_MS = 1_400;
/** After this long waiting, say honestly what's happening (the chain is working, not the game). */
export const SLOW_VRF_MS = 8_000;
/** The result card stays up at least this long before reveal/next actions matter. */
export const RESULT_COUNT_UP_MS = {
  loss: 0,
  small: 600,
  win: 1_200,
  big: 2_000,
  jackpot: 3_000,
} as const;
/** Presentation v1: the bank's exhibition parameters. Changing these breaks reproducibility. */
export const PRESENTATION = { players: 4, difficulty: 75, mapCount: 3 } as const;
export const STAKE_PRESETS = [
  { label: '½', factor: 0.5 },
  { label: '2×', factor: 2 },
] as const;
