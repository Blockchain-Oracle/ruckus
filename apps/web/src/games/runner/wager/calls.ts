import { getBetTable, WIPEOUT_CALLS, WIPEOUT_CLASSES } from '@arena/casino-math';

import { VERB_COLORS } from '../config.ts';

/** How each call looks on the sheet: the barrier colour it names (clean runs are gold). */
export const CALL_LOOK = [
  { label: 'Any wipeout', sub: 'Something stops them', color: '#fff1d6' },
  { label: 'Cyan', sub: 'Fails a jump', color: VERB_COLORS.jump },
  { label: 'Yellow', sub: 'Fails a duck', color: VERB_COLORS.duck },
  { label: 'Red', sub: 'Fails a dodge', color: VERB_COLORS.move },
  { label: 'Purple', sub: 'Fails a strict duck', color: VERB_COLORS.strict },
  { label: 'Clean run', sub: 'Makes the line', color: '#ffc23a' },
] as const satisfies readonly { label: string; sub: string; color: string }[];

export function callAt(index: number) {
  const call = WIPEOUT_CALLS[index] ?? WIPEOUT_CALLS[0];
  const table = getBetTable(call.betType);
  const make = table.classes[0];
  const total = table.classes.reduce((s, c) => s + Number(c.weight), 0);
  return {
    ...call,
    look: CALL_LOOK[index] ?? CALL_LOOK[0],
    chance: `${Number(make?.weight ?? 0)} in ${total}`,
    pays: Number(make?.multiplierBps ?? 0) / 10_000,
  };
}
export type WipeoutCall = ReturnType<typeof callAt>;

export const WIPEOUT_WEIGHTS = WIPEOUT_CLASSES.map((c) => c.weight);

const ENDINGS = [
  'Wiped out on a cyan jump barrier',
  'Wiped out on a yellow duck bar',
  'Wiped out on a red wall',
  'Wiped out on a purple strict-duck block',
  'Made it clean to the line',
] as const;
/** How an ending reads in the result card. */
export const describeEnding = (ending: number) => ENDINGS[ending] ?? ENDINGS[4];
