import { CheckIcon, CopyIcon, CrownIcon, RobotIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CHICKENZ_MSG } from '@arena/protocol/chickenz';

import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/ui/primitives/sheet.tsx';

import { useChickenzPrefs } from '../prefs.ts';
import { HERO_NAMES, HEROES, type Hero } from '../sprites.ts';
import { HeroPortrait } from '../wager/HeroPortrait.tsx';
import { isHero } from './heroes.ts';
import { isHost, mySeat, useRoom } from './roomStore.ts';
import { createRoom, joinRoom, leaveRoom, quickPlay, sendCommand } from './session.ts';
import { useRoomSheet } from './sheetStore.ts';

const SEATS = 4;
const CODE_LENGTH = 5;
const MIN_TO_START = 2;

function shareUrl(code: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('game', 'chickenz');
  url.searchParams.set('room', code);
  return url.toString();
}

async function copyLink(code: string) {
  try {
    await navigator.clipboard.writeText(shareUrl(code));
    toast.success('Invite link copied');
  } catch {
    // Sandboxed iframes can block the clipboard: fall back to showing the link to copy by hand.
    toast.info(shareUrl(code), {
      description: 'Copy this link to invite friends',
      duration: 10_000,
    });
  }
}

export function RoomSheet() {
  const open = useRoomSheet((s) => s.open);
  const setOpen = useRoomSheet((s) => s.setOpen);
  const room = useRoom();
  const inLobby = room.status === 'inRoom' && room.phase === 'lobby';
  return (
    <Sheet open={open && (room.status !== 'inRoom' || inLobby)} onOpenChange={setOpen}>
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
              ? 'Share the code or link. Empty seats can be filled with labelled bots.'
              : 'Play with friends, strangers, and bots in the same match.'}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">{inLobby ? <Lobby /> : <Entry />}</div>
      </SheetContent>
    </Sheet>
  );
}

function Entry() {
  const room = useRoom();
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
          onClick={() => void quickPlay()}
        >
          Quick play
        </Button>
        <Button
          variant="teal"
          size="lg"
          sound="ui.confirm"
          disabled={busy}
          onClick={() => void createRoom()}
        >
          Create room
        </Button>
      </div>
      <form
        className="flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === CODE_LENGTH) void joinRoom(code);
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
        {busy
          ? 'Connecting to the arena…'
          : (room.error ?? 'Bots are always labelled. No fake players, ever.')}
      </p>
    </div>
  );
}

function Lobby() {
  const room = useRoom();
  const me = mySeat(room);
  const host = isHost(room);
  const seats = [...room.seats].sort((a, b) => a.slot - b.slot);
  const taken = new Set(seats.map((s) => s.hero));
  const canStart =
    seats.length >= MIN_TO_START &&
    seats.every((s) => s.ready || s.sessionId === room.hostSessionId);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-line bg-ink-3 px-4 py-3">
        <div>
          <div className="label-caps text-xs text-cream-dim">Room code</div>
          <div className="font-pixel text-3xl tracking-[0.3em] text-[#ffee58] select-all">
            {room.code}
          </div>
        </div>
        <Button size="sm" variant="teal" onClick={() => void copyLink(room.code)}>
          <CopyIcon weight="bold" /> Copy link
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: SEATS }, (_, slot) => {
          const seat = seats[slot];
          return (
            <li
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
                  <HeroPortrait
                    hero={isHero(seat.hero) ? seat.hero : HEROES[0]}
                    className={cn('w-12', !seat.connected && 'opacity-40')}
                  />
                  <span className="flex items-center gap-1 text-sm font-bold">
                    {seat.sessionId === room.hostSessionId && (
                      <CrownIcon weight="fill" className="size-3.5 text-[#ffee58]" />
                    )}
                    {seat.kind === 'bot' ? (
                      <RobotIcon weight="bold" className="size-3.5 text-teal" />
                    ) : null}
                    <span className="max-w-24 truncate">{seat.name}</span>
                  </span>
                  <span className="font-pixel text-[10px] uppercase text-cream-dim">
                    {seat.kind === 'bot'
                      ? 'BOT'
                      : seat.kind === 'waiting'
                        ? 'WATCHING · NEXT MATCH'
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

      {me && (
        <fieldset className="flex items-center justify-center gap-2">
          <legend className="sr-only">Your bird</legend>
          {HEROES.map((h: Hero) => {
            const mine = me.hero === h;
            const disabled = !mine && taken.has(h);
            return (
              <label
                key={h}
                title={HERO_NAMES[h]}
                className={cn(
                  'cursor-pointer rounded-md border-2 p-1',
                  mine ? 'border-tomato' : 'border-transparent',
                  disabled && 'cursor-not-allowed opacity-30',
                )}
              >
                <input
                  type="radio"
                  name="room-hero"
                  className="sr-only"
                  checked={mine}
                  disabled={disabled}
                  onChange={() => {
                    sendCommand(CHICKENZ_MSG.hero, h);
                    useChickenzPrefs.getState().set({ hero: h });
                  }}
                />
                <HeroPortrait hero={h} className="w-10" />
              </label>
            );
          })}
        </fieldset>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {host ? (
          <>
            <Button
              size="sm"
              disabled={seats.length >= SEATS}
              onClick={() => sendCommand(CHICKENZ_MSG.addBot)}
            >
              <RobotIcon weight="bold" /> Add bot
            </Button>
            <Button
              size="sm"
              disabled={!seats.some((s) => s.kind === 'bot')}
              onClick={() => sendCommand(CHICKENZ_MSG.removeBot)}
            >
              Remove bot
            </Button>
            <Button
              variant="tomato"
              sound="ui.confirm"
              disabled={!canStart}
              onClick={() => sendCommand(CHICKENZ_MSG.start)}
            >
              Start match
            </Button>
          </>
        ) : (
          <Button
            variant={me?.ready ? 'ink' : 'tomato'}
            onClick={() => sendCommand(CHICKENZ_MSG.ready, !me?.ready)}
          >
            {me?.ready ? <CheckIcon weight="bold" /> : null} {me?.ready ? 'Ready!' : 'Ready up'}
          </Button>
        )}
        <Button size="sm" sound="ui.back" onClick={() => void leaveRoom()}>
          Leave room
        </Button>
      </div>
      {host && !canStart && (
        <p className="text-center text-xs text-cream-dim">
          {seats.length < MIN_TO_START
            ? 'Invite a friend or add a bot to start.'
            : 'Waiting for everyone to ready up.'}
        </p>
      )}
    </div>
  );
}
