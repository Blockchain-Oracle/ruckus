import type { World } from '@arena/sim-soccer';

import { MatchResults } from '@/ui/game/MatchResults.tsx';

import { KITS } from '../config.ts';

/** Full time: the score and who won, on the shared results screen. */
export function Results({
  w,
  you,
  online,
  onRematch,
  onLeave,
}: {
  w: World;
  you: number;
  online: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const [a, b] = w.score;
  const myTeam = you >= 0 ? you % 2 : -1;
  const winner = a === b ? -1 : a > b ? 0 : 1;
  const title =
    winner < 0 ? 'DRAW' : winner === myTeam ? 'YOU WIN!' : `${KITS[winner as 0 | 1].name} win`;
  return (
    <MatchResults
      title={title}
      won={winner >= 0 && winner === myTeam}
      hero={
        <div className="flex items-center justify-center gap-4 font-display text-5xl text-cream">
          <span style={{ color: KITS[0].body }}>{a}</span>
          <span className="text-2xl text-cream-dim">–</span>
          <span style={{ color: KITS[1].body }}>{b}</span>
        </div>
      }
      online={online}
      onRematch={onRematch}
      onLeave={onLeave}
    />
  );
}
