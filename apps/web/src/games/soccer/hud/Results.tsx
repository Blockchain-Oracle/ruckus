import type { World } from '@arena/sim-soccer';

import { Button } from '@/ui/Button.tsx';

import { KITS } from '../config.ts';

/** Full time: the score, who won, rematch or back to the hub. */
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
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div className={`font-display text-4xl ${winner === myTeam ? 'text-gold' : 'text-cream'}`}>
          {title}
        </div>
        <div className="flex items-center gap-4 font-display text-5xl text-cream">
          <span style={{ color: KITS[0].body }}>{a}</span>
          <span className="text-2xl text-cream-dim">–</span>
          <span style={{ color: KITS[1].body }}>{b}</span>
        </div>
        {online && (
          <p className="text-xs text-cream-dim">Back to the room in a moment for the next match.</p>
        )}
        <div className="flex gap-3">
          {!online && (
            <Button variant="tomato" sound="ui.confirm" onClick={onRematch}>
              Rematch
            </Button>
          )}
          <Button sound="ui.back" onClick={onLeave}>
            {online ? 'Leave room' : 'Back to hub'}
          </Button>
        </div>
      </div>
    </div>
  );
}
