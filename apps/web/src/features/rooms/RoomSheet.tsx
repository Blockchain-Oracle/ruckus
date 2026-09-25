import { CheckIcon, CopyIcon, CrownIcon, EyeIcon, RobotIcon } from '@phosphor-icons/react';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/ui/primitives/sheet.tsx';

import { isHost, mySeat, type RoomKit, type SeatView } from './kit.ts';

const CODE_LENGTH = 5;

type Props = {
  kit: RoomKit;
  /** `?game=` value for invite links. */
  gameId: string;
  /** Seats at the table (watchers are listed separately). */
  seats: number;
  minToStart: number;
  /** A seat's picture (a hero portrait, a cue-ball badge…). */
  avatar: (seat: SeatView) => ReactNode;
  /** Game-specific lobby controls (a hero picker…). */
  extra?: ReactNode;
  commands: { ready: string; addBot: string; removeBot: string; start: string };
};

function shareUrl(gameId: string, code: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('game', gameId);
  url.searchParams.set('room', code);
  return url.toString();
}

async function copyLink(gameId: string, code: string) {
  try {
    await navigator.clipboard.writeText(shareUrl(gameId, code));
    toast.success('Invite link copied');
  } catch {
    // Sandboxed iframes can block the clipboard: show the link to copy by hand instead.
    toast.info(shareUrl(gameId, code), {
      description: 'Copy this link to invite friends',
      duration: 10_000,
    });
  }
}

/** A game's online lobby: quick play / create / join by code, then seats, invite and start. */
export function RoomSheet(props: Props) {
  const room = props.kit.useRoom();
  const inLobby = room.status === 'inRoom' && room.phase === 'lobby';
  return (
    <Sheet
      open={room.sheetOpen && (room.status !== 'inRoom' || inLobby)}
      onOpenChange={(o) => room.set({ sheetOpen: o })}
    >
      <SheetContent
        side="bottom"
        className="mx-auto max-w-2xl rounded-t-2xl border-line bg-ink-2 text-cream"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-3xl text-cream">
            {inLobby ? `Room ${room.code}` : 'Play online'}
          </SheetTitle>
          <SheetDescription className="text-cream-dim">
            {inLobby
              ? 'Share the code or link. Empty seats can take a labelled bot; anyone else joins to watch.'
              : 'Play with friends, strangers, and bots. Friends who join late watch live.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {inLobby ? <Lobby {...props} /> : <Entry kit={props.kit} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Entry({ kit }: { kit: RoomKit }) {
  const room = kit.useRoom();
  const [code, setCode] = useState('');
  const busy = room.status === 'connecting';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="tomato"
          size="lg"
          sound="ui.confirm"
          disabled={busy}
          onClick={() => void kit.quickPlay()}
        >
          Quick play
        </Button>
        <Button
          variant="teal"
          size="lg"
          sound="ui.confirm"
          disabled={busy}
          onClick={() => void kit.createRoom()}
        >
          Create room
        </Button>
      </div>
      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === CODE_LENGTH) void kit.joinRoom(code);
        }}
      >
        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .slice(0, CODE_LENGTH),
            )
          }
          placeholder="ROOM CODE"
          aria-label="Room code"
          className="font-pixel h-12 flex-1 rounded-[var(--radius-button)] border-2 border-line bg-ink px-4 text-lg tracking-[0.3em] text-cream outline-none focus:border-teal"
        />
        <Button type="submit" size="md" disabled={busy || code.length !== CODE_LENGTH}>
          Join
        </Button>
      </form>
      <p className="text-center text-sm text-cream-dim" role="status">
        {busy ? 'Connecting…' : (room.error ?? 'Bots are always labelled. No fake players, ever.')}
      </p>
    </div>
  );
}

function Lobby({ kit, gameId, seats: seatCount, minToStart, avatar, extra, commands }: Props) {
  const room = kit.useRoom();
  const me = mySeat(room);
  const host = isHost(room);
  const table = room.seats.filter((s) => s.kind !== 'waiting').sort((a, b) => a.slot - b.slot);
  const watchers = room.seats.filter((s) => s.kind === 'waiting');
  const canStart =
    table.length >= minToStart && table.every((s) => s.ready || s.sessionId === room.hostSessionId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-line bg-ink-3 px-4 py-3">
        <div>
          <div className="label-caps text-xs text-cream-dim">Room code</div>
          <div className="font-pixel text-3xl tracking-[0.3em] text-[#ffee58] select-all">
            {room.code}
          </div>
        </div>
        <Button size="sm" variant="teal" onClick={() => void copyLink(gameId, room.code)}>
          <CopyIcon weight="bold" /> Copy link
        </Button>
      </div>

      <ul
        className={cn('grid gap-3', seatCount <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}
      >
        {Array.from({ length: seatCount }, (_, slot) => {
          const seat = table.find((s) => s.slot === slot);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: seats are positional
              key={slot}
              className={cn(
                'flex min-h-28 flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border-2 p-2 text-center',
                seat
                  ? seat.sessionId === room.mySessionId
                    ? 'border-tomato bg-ink-3'
                    : 'border-line bg-ink-3'
                  : 'border-dashed border-line/60',
              )}
            >
              {seat ? (
                <>
                  <span className={cn(!seat.connected && 'opacity-40')}>{avatar(seat)}</span>
                  <span className="flex items-center gap-1 text-sm font-bold">
                    {seat.sessionId === room.hostSessionId && (
                      <CrownIcon weight="fill" className="size-3.5 text-[#ffee58]" />
                    )}
                    {seat.kind === 'bot' && (
                      <RobotIcon weight="bold" className="size-3.5 text-teal" />
                    )}
                    <span className="max-w-28 truncate">{seat.name}</span>
                  </span>
                  <span className="font-pixel text-[10px] uppercase text-cream-dim">
                    {seat.kind === 'bot'
                      ? 'BOT'
                      : seat.sessionId === room.mySessionId
                        ? 'YOU'
                        : seat.connected
                          ? seat.ready
                            ? 'READY'
                            : 'NOT READY'
                          : 'RECONNECTING'}
                  </span>
                </>
              ) : (
                <span className="font-pixel text-[10px] uppercase text-cream-dim">Waiting…</span>
              )}
            </li>
          );
        })}
      </ul>

      {watchers.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-2 text-xs text-cream-dim">
          <EyeIcon weight="bold" className="size-4" /> Watching:{' '}
          {watchers.map((w) => (
            <span key={w.sessionId} className="rounded-full bg-ink-3 px-2 py-0.5">
              {w.name}
            </span>
          ))}
        </p>
      )}

      {extra}

      <div className="flex flex-wrap justify-center gap-3">
        {host ? (
          <>
            <Button
              size="sm"
              disabled={table.length >= seatCount}
              onClick={() => kit.send(commands.addBot)}
            >
              <RobotIcon weight="bold" /> Add bot
            </Button>
            <Button
              size="sm"
              disabled={!table.some((s) => s.kind === 'bot')}
              onClick={() => kit.send(commands.removeBot)}
            >
              Remove bot
            </Button>
            <Button
              variant="tomato"
              sound="ui.confirm"
              disabled={!canStart}
              onClick={() => kit.send(commands.start)}
            >
              Start
            </Button>
          </>
        ) : me && me.kind !== 'waiting' ? (
          <Button
            variant={me.ready ? 'ink' : 'tomato'}
            onClick={() => kit.send(commands.ready, !me.ready)}
          >
            {me.ready ? <CheckIcon weight="bold" /> : null} {me.ready ? 'Ready!' : 'Ready up'}
          </Button>
        ) : null}
        <Button size="sm" sound="ui.back" onClick={() => void kit.leaveRoom()}>
          Leave room
        </Button>
      </div>
      {host && !canStart && (
        <p className="text-center text-xs text-cream-dim">
          {table.length < minToStart
            ? 'Invite a friend or add a bot to start.'
            : 'Waiting for everyone to ready up.'}
        </p>
      )}
    </div>
  );
}
