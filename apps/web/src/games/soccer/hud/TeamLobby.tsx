import { CrownIcon, PlusIcon, RobotIcon, XIcon } from '@phosphor-icons/react';

import { SOCCER_MSG, SOCCER_PER_TEAM, type SoccerBotLevel } from '@arena/protocol/soccer';

import { isHost, mySeat, type SeatView } from '@/features/rooms/kit.ts';
import { cn } from '@/lib/utils.ts';

import { KITS } from '../config.ts';
import { soccerRooms } from '../net/online.ts';

const LEVELS: readonly SoccerBotLevel[] = ['rookie', 'pro', 'legend'];
const LEVEL_LABEL: Record<SoccerBotLevel, string> = {
  rookie: 'Rookie',
  pro: 'Pro',
  legend: 'Legend',
};
const nextLevel = (l: string | undefined): SoccerBotLevel => {
  const i = LEVELS.indexOf((l ?? 'pro') as SoccerBotLevel);
  return LEVELS[(i + 1) % LEVELS.length] ?? 'pro';
};

const onTeam = (seats: SeatView[], team: 0 | 1) =>
  seats.filter((s) => s.kind !== 'waiting' && s.team === team);

/** "2v1": the line-up as it stands. */
export const lineup = (seats: SeatView[]) =>
  `${onTeam(seats, 0).length}v${onTeam(seats, 1).length}`;

/** Start needs someone on each side (the sim plays 1v1 up to 2v2). */
export const lineupBlock = (seats: SeatView[]) =>
  onTeam(seats, 0).length === 0 || onTeam(seats, 1).length === 0
    ? 'Each side needs a player or a bot.'
    : null;

/**
 * Soccer's lobby table: two team columns, two places each. Players tap an open place on the other
 * side to move; the host fills open places with a bot, taps a bot to change its level, or clears
 * it. What this shows is exactly what kicks off (S35: no bots added behind anyone's back).
 */
export function TeamLobby() {
  const room = soccerRooms.useRoom();
  const me = mySeat(room);
  const host = isHost(room);
  const send = soccerRooms.send;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as const).map((team) => {
          const kit = KITS[team];
          const members = onTeam(room.seats, team);
          const canMoveHere =
            me?.kind === 'human' && me.team !== team && members.length < SOCCER_PER_TEAM;
          return (
            <section
              key={team}
              aria-label={`Team ${kit.name}`}
              className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border-2 p-2"
              style={{ borderColor: kit.body }}
            >
              <h4
                className="text-center font-display text-sm uppercase"
                style={{ color: kit.body }}
              >
                {kit.name}
              </h4>
              {Array.from({ length: SOCCER_PER_TEAM }, (_, i) => {
                const seat = members[i];
                if (seat)
                  return (
                    <div
                      key={seat.sessionId || `bot${seat.slot}`}
                      className={cn(
                        'flex min-w-0 items-center gap-2 rounded-lg border-2 bg-ink-3 px-2 py-1.5',
                        seat.sessionId && seat.sessionId === room.mySessionId
                          ? 'border-cream'
                          : 'border-line',
                        !seat.connected && 'opacity-50',
                      )}
                    >
                      <span
                        className="grid h-7 w-6 shrink-0 place-items-center rounded-[50%/60%_60%_40%_40%] border-2 border-ink max-[380px]:hidden"
                        style={{ background: i === 0 ? kit.body : kit.partner }}
                      />
                      <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                        <span className="flex min-w-0 items-center gap-1 text-sm font-bold">
                          {seat.sessionId === room.hostSessionId && seat.sessionId && (
                            <CrownIcon weight="fill" className="size-3 shrink-0 text-[#ffee58]" />
                          )}
                          <span className="truncate">{seat.name.replace(/^Bot · /, '')}</span>
                        </span>
                        {host && seat.kind === 'bot' ? (
                          // The level itself is the control: tap to cycle Rookie → Pro → Legend.
                          <button
                            type="button"
                            aria-label={`Bot level ${seat.botLevel ?? 'pro'}: change`}
                            onClick={() =>
                              send(SOCCER_MSG.setBotLevel, {
                                slot: seat.slot,
                                level: nextLevel(seat.botLevel),
                              })
                            }
                            className="inline-flex w-fit items-center gap-1 rounded-full bg-ink px-1.5 font-pixel text-[10px] uppercase text-teal underline-offset-2 hover:underline"
                          >
                            <RobotIcon weight="bold" className="size-3" />
                            {LEVEL_LABEL[(seat.botLevel ?? 'pro') as SoccerBotLevel] ?? 'Pro'}
                          </button>
                        ) : (
                          <span className="font-pixel text-[10px] uppercase text-cream-dim">
                            {seat.kind === 'bot'
                              ? `Bot · ${LEVEL_LABEL[(seat.botLevel ?? 'pro') as SoccerBotLevel] ?? 'Pro'}`
                              : seat.sessionId === room.mySessionId
                                ? 'You'
                                : !seat.connected
                                  ? 'Reconnecting'
                                  : seat.sessionId === room.hostSessionId
                                    ? 'Host'
                                    : seat.ready
                                      ? 'Ready'
                                      : 'Not ready'}
                          </span>
                        )}
                      </span>
                      {host && seat.kind === 'bot' && (
                        <>
                          <button
                            type="button"
                            aria-label="Remove bot"
                            onClick={() => send(SOCCER_MSG.removeBot, { slot: seat.slot })}
                            className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-line text-cream-dim hover:text-cream max-[380px]:size-6"
                          >
                            <XIcon weight="bold" className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: open places are positional
                    key={`open${i}`}
                    className="flex min-h-12 flex-wrap items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line/60 p-1"
                  >
                    {canMoveHere && (
                      <button
                        type="button"
                        onClick={() => send(SOCCER_MSG.setTeam, { team })}
                        className="rounded-full px-2.5 py-1 font-display text-xs text-cream hover:bg-ink-3"
                      >
                        Move here
                      </button>
                    )}
                    {host && (
                      <button
                        type="button"
                        onClick={() => send(SOCCER_MSG.addBot, { team, level: 'pro' })}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-line px-2.5 py-1 font-display text-xs text-teal hover:border-cream-dim"
                      >
                        <PlusIcon weight="bold" /> Bot
                      </button>
                    )}
                    {!canMoveHere && !host && (
                      <span className="font-pixel text-[10px] uppercase text-cream-dim">Open</span>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <p className="text-center text-xs text-cream-dim">
        <span className="font-display text-cream">{lineup(room.seats)}</span>
        {host ? ' · tap a bot to change its level' : ' · tap an open place to switch sides'}
      </p>
    </div>
  );
}
