import { MapId } from '@arena/sim-chickenz';

/** Chickenz match flow timings (`GameScene.ts` + `GameRoom.ts`), in ms unless noted. */
export const COUNTDOWN_STEP_MS = 350;
export const COUNTDOWN_STEPS = ['3', '2', '1', 'GO!'] as const;
export const GO_HOLD_MS = 400;
export const ROUND_POPUP_MS = 500;
/** Round over: banner while the survivor taunts (60 ticks) plus the 750 ms transition gap. */
export const ROUND_OVER_MS = 1_000 + 750;
export const MATCH_OVER_MS = 2_500;
/** Diamond wipe: 5 columns × 60 ms wave + 180 ms grow, 250 ms hold, same out. */
export const WIPE_COLUMNS = 5;
export const WIPE_ROWS = 3;
export const WIPE_WAVE_MS = 60;
export const WIPE_GROW_MS = 180;
export const WIPE_HOLD_MS = 250;
export const WIPE_IN_MS = WIPE_GROW_MS + WIPE_WAVE_MS * (WIPE_COLUMNS - 1);
/** Casual Chickenz is first to 3 round wins. */
export const WINS_TO_TAKE_MATCH = 3;
/** Practice bots: a fair fight for a newcomer; the Arena is Chickenz's classic map. */
export const PRACTICE_BOT_DIFFICULTY = 55;
export const PRACTICE_PLAYERS = 4;
export const MATCH_MAPS = [MapId.Arena, MapId.Towers, MapId.Bridges] as const;
