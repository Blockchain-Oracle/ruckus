import { FINISH_CALLS, FINISH_CLASSES, getBetTable } from '@arena/casino-math';

export type TeamPick = 'tomato' | 'either' | 'violet';
export type FinishPick = 'any' | 'shot' | 'header' | 'wood' | 'none';

const INDEX: Record<FinishPick, Partial<Record<TeamPick, number>>> = {
  any: { tomato: 0, violet: 1, either: 11 },
  shot: { tomato: 2, violet: 5, either: 8 },
  header: { tomato: 3, violet: 6, either: 9 },
  wood: { tomato: 4, violet: 7, either: 10 },
  none: { either: 12 },
};

/** The UI's two pickers → one contract call (no goal belongs to neither team). */
export function callFor(team: TeamPick, finish: FinishPick) {
  const i = INDEX[finish][finish === 'none' ? 'either' : team] ?? 0;
  const call = FINISH_CALLS[i] ?? FINISH_CALLS[0];
  const table = getBetTable(call.betType);
  const make = table.classes[0];
  const total = table.classes.reduce((s, c) => s + Number(c.weight), 0);
  return {
    ...call,
    chance: `${Number(make?.weight ?? 0)} in ${total}`,
    pays: Number(make?.multiplierBps ?? 0) / 10_000,
  };
}
export type FinishCall = ReturnType<typeof callFor>;

export const FINISH_WEIGHTS = FINISH_CLASSES.map((c) => c.weight);

/** How a finish class reads in the result card. */
export function describeFinish(finish: number) {
  const c = FINISH_CLASSES[finish];
  if (!c || c.team < 0) return 'Nobody scored in 20 seconds';
  const team = c.team === 0 ? 'Tomato' : 'Violet';
  return c.finish === 'header'
    ? `${team} scored with a header`
    : c.finish === 'wood'
      ? `${team} scored off the woodwork`
      : `${team} scored with a shot`;
}
