import { ArrowLeftIcon } from '@phosphor-icons/react';

import { ALIVE_FLAG, H, MAX_HEALTH_HP, P, playerBase, TICK_HZ } from '@arena/sim-chickenz';

import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';

import { WINS_TO_TAKE_MATCH } from '../match/config.ts';
import { getDriver } from '../match/runtime.ts';
import { useMatch } from '../match/store.ts';
import { HeroPortrait } from '../wager/HeroPortrait.tsx';
import { useTick } from './useTick.ts';

const HUD_HZ = 12;
/** Chickenz's announce style: Silkscreen, #ffee58 with a #c9a800 drop and a soft black shadow. */
const ANNOUNCE_SHADOW = '2px 2px 0 #c9a800, 4px 4px 0 rgba(0,0,0,0.5)';
const PLAYER_COLORS = [
  'var(--player-1)',
  'var(--player-2)',
  'var(--player-3)',
  'var(--player-4)',
] as const;
const SHAKE_THRESHOLD = 100;

export function MatchHud({ onLeave }: { onLeave: () => void }) {
  useTick(HUD_HZ);
  const { heroes, names, wins, announce, status, localSlot } = useMatch();
  const driver = getDriver();
  const v = driver?.curr;
  if (!v || status === 'off') return null;

  const tick = v[H.tick] ?? 0;
  const roundTicks = driver?.sim.round_ticks() ?? 0;
  const secondsLeft = Math.max(0, Math.ceil((roundTicks - tick) / TICK_HZ));
  const suddenDeath = (v[H.zoneLeft] ?? 0) > 0 && !(v[H.matchOver] ?? 0);
  const lb = playerBase(localSlot);
  const shake = (v[lb + P.stompedBy] ?? -1) >= 0 ? (v[lb + P.shakeProgress] ?? 0) : -1;

  return (
    <div className="pointer-events-none absolute inset-0 font-pixel">
      <div className="absolute inset-x-0 top-3 flex justify-center gap-2 pr-4 pl-16 sm:gap-3 [@media(pointer:fine)]:top-4 [@media(pointer:fine)]:px-4">
        {heroes.map((hero, slot) => {
          const b = playerBase(slot);
          const hp = Math.max(0, v[b + P.health] ?? 0);
          const alive = ((v[b + P.flags] ?? 0) & ALIVE_FLAG) !== 0;
          return (
            <div
              key={hero}
              className={cn(
                'flex items-center gap-2 rounded-md border-2 bg-ink/85 px-2 py-1 transition-opacity',
                slot === localSlot ? 'border-tomato' : 'border-line',
                !alive && 'opacity-45 grayscale',
              )}
            >
              <HeroPortrait hero={hero} className="w-7" />
              <div className="w-20 sm:w-24">
                <div
                  className="truncate text-[10px] uppercase leading-tight"
                  style={{ color: PLAYER_COLORS[slot] }}
                >
                  {names[slot]}
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-black/60">
                  <div
                    className="h-full transition-[width] duration-150"
                    style={{
                      width: `${(hp / MAX_HEALTH_HP) * 100}%`,
                      background: hp > 30 ? 'var(--win)' : 'var(--loss)',
                    }}
                  />
                </div>
                <div className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: WINS_TO_TAKE_MATCH }, (_, i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full"
                      style={{
                        background:
                          i < (wins[slot] ?? 0) ? 'var(--cream)' : 'rgb(255 241 214 / 0.2)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="tabular absolute top-20 right-4 text-lg text-cream sm:top-24 sm:right-8 sm:text-xl">
        {status === 'playing' || status === 'roundOver' ? `${secondsLeft}s` : ''}
      </div>

      {suddenDeath && (
        <div
          className="absolute inset-x-0 top-36 text-center text-lg text-[#ff4444] sm:top-24"
          style={{ textShadow: '2px 2px 0 #000' }}
        >
          SUDDEN DEATH
        </div>
      )}

      {announce && (
        <div className="absolute inset-0 grid place-items-center px-4">
          <div
            className="whitespace-pre-line text-center text-3xl uppercase leading-relaxed tracking-[2px] text-[#ffee58] sm:text-4xl"
            style={{ textShadow: ANNOUNCE_SHADOW }}
          >
            {announce}
          </div>
        </div>
      )}

      {shake >= 0 && (
        <div className="absolute inset-x-0 bottom-32 flex flex-col items-center gap-1">
          <div className="text-sm text-cream" style={{ textShadow: '2px 2px 0 #000' }}>
            SHAKE HIM OFF! ← →
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-sm border border-black bg-black/60">
            <div
              className="h-full bg-[#ffee58]"
              style={{ width: `${Math.min(100, (shake / SHAKE_THRESHOLD) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-4 hidden text-[10px] uppercase text-cream-dim [@media(pointer:fine)]:sm:block sm:left-8">
        A/D move · W jump · Space shoot · S taunt
      </div>

      <div className="pointer-events-auto absolute top-20 left-4 sm:top-4 sm:left-auto sm:right-auto">
        <span className="sr-only">{status}</span>
      </div>
      <button
        type="button"
        aria-label="Leave match"
        onClick={onLeave}
        className="pointer-events-auto absolute top-3 left-3 grid size-11 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream [@media(pointer:fine)]:hidden"
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="pointer-events-auto absolute bottom-6 left-1/2 hidden -translate-x-1/2 [@media(pointer:fine)]:block">
        <Button size="sm" sound="ui.back" onClick={onLeave}>
          <ArrowLeftIcon weight="bold" /> Leave
        </Button>
      </div>
    </div>
  );
}

/** Match over: standings, then rematch or back to the hub. */
export function MatchResults({
  onRematch,
  onLeave,
}: {
  onRematch: () => void;
  onLeave: () => void;
}) {
  const { heroes, names, wins, winner, localSlot, status, announce } = useMatch();
  if (status !== 'matchOver' || announce) return null;
  const order = heroes.map((_, slot) => slot).sort((a, b) => (wins[b] ?? 0) - (wins[a] ?? 0));
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-ink/50 px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border-2 border-line bg-ink-2 p-6 text-center shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div
          className={cn('font-display text-4xl', winner === localSlot ? 'text-gold' : 'text-cream')}
        >
          {winner === localSlot ? 'YOU WIN!' : 'GOOD GAME'}
        </div>
        <ol className="flex flex-col gap-2 text-left">
          {order.map((slot, place) => (
            <li
              key={slot}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 bg-ink-3 px-3 py-2',
                slot === localSlot ? 'border-tomato' : 'border-line',
              )}
            >
              <span className="font-display w-6 text-cream-dim">{place + 1}</span>
              <HeroPortrait hero={heroes[slot] ?? heroes[0] ?? 'ninja-frog'} className="w-8" />
              <span className="flex-1 truncate">{names[slot]}</span>
              <span className="tabular font-bold">{wins[slot] ?? 0} wins</span>
            </li>
          ))}
        </ol>
        <div className="flex justify-center gap-3">
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
