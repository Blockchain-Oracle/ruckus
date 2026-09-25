import { Button } from '@/ui/Button.tsx';

import { usePool } from '../match/store.ts';

export function PoolResults({
  onRematch,
  onLeave,
}: {
  onRematch: () => void;
  onLeave: () => void;
}) {
  const { status, winner, names, bots, message } = usePool();
  if (status !== 'over' || winner < 0) return null;
  const w = winner as 0 | 1;
  const youWon = !bots[w];
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/50 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div className={`font-display text-4xl ${youWon ? 'text-gold' : 'text-cream'}`}>
          {youWon ? 'YOU WIN!' : `${names[w]} wins`}
        </div>
        {message && <p className="text-cream-dim">{message}</p>}
        <div className="flex gap-3">
          <Button variant="tomato" sound="ui.confirm" onClick={onRematch}>
            Rematch
          </Button>
          <Button sound="ui.back" onClick={onLeave}>
            Back to hub
          </Button>
        </div>
      </div>
    </div>
  );
}
