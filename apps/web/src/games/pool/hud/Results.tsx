import { MatchResults } from '@/ui/game/MatchResults.tsx';

import { usePool } from '../match/store.ts';

export function PoolResults({
  online,
  onRematch,
  onLeave,
}: {
  online: boolean;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const { status, winner, names, message, mySlot } = usePool();
  if (status !== 'over' || winner < 0) return null;
  const w = winner as 0 | 1;
  const youWon = w === mySlot;
  return (
    <MatchResults
      title={youWon ? 'YOU WIN!' : `${names[w]} wins`}
      won={youWon}
      subtitle={message}
      online={online}
      onRematch={onRematch}
      onLeave={onLeave}
    />
  );
}
