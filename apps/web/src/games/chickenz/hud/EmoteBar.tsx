import { ChatCircleDotsIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils.ts';

import { EMOTE_TEXT, EMOTES, sayEmote } from '../emotes/emotes.ts';
import { useChickenzPrefs } from '../prefs.ts';

/** Digit1…Digit6 say the emotes in order, unless the player bound that key to an action. */
const KEY_CODES = EMOTES.map((_, i) => `Digit${i + 1}`);

function useEmoteKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const index = KEY_CODES.indexOf(e.code);
      if (index < 0 || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const bound = Object.values(useChickenzPrefs.getState().bindings).flat();
      if (bound.includes(e.code)) return;
      const emote = EMOTES[index];
      if (emote) sayEmote(emote);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Quick chat: a bubble button that opens the six emotes (with their keys on desktop). */
export function EmoteBar({ className }: { className?: string }) {
  useEmoteKeys();
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('pointer-events-auto flex items-start gap-2', className)}>
      <button
        type="button"
        aria-label="Quick chat"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full border-2 bg-ink/85 text-cream hover:border-cream-dim',
          open ? 'border-cream' : 'border-line',
        )}
      >
        <ChatCircleDotsIcon weight="bold" className="size-5" />
      </button>
      {open && (
        <ul className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">
          {EMOTES.map((emote, i) => (
            <li key={emote}>
              <button
                type="button"
                onClick={() => {
                  sayEmote(emote);
                  setOpen(false);
                }}
                className="font-pixel flex h-9 items-center gap-1.5 rounded-md border-2 border-[#1b1024] bg-[#fff1d6] px-2.5 text-[10px] uppercase text-[#1b1024] shadow-[0_3px_0_#1b1024] active:translate-y-[2px] active:shadow-[0_1px_0_#1b1024]"
              >
                <span className="hidden text-[#1b1024]/50 [@media(pointer:fine)]:inline">
                  {i + 1}
                </span>
                {EMOTE_TEXT[emote]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
