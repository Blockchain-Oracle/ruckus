import { PencilSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { NAME_MAX, useProfile, validName } from '@/app/stores/profile.ts';

/**
 * "Playing as NAME ✎": the one place a player names themself (ADR-010), shown in the
 * Play-with-friends lobby because that is where others see the name. Local play never asks.
 */
export function NameField() {
  const name = useProfile((s) => s.name);
  const setName = useProfile((s) => s.setName);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && validName(draft)) setName(draft);
    setDraft(null);
  };
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-cream-dim">
      <span className="shrink-0">Playing as</span>
      {draft === null ? (
        <button
          type="button"
          onClick={() => setDraft(name)}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-full border-2 border-line bg-ink px-3 py-1 font-display text-cream hover:border-cream-dim"
          aria-label={`Change your name (${name})`}
        >
          <span className="truncate">{name}</span>
          <PencilSimpleIcon weight="bold" className="size-4 shrink-0 text-cream-dim" />
        </button>
      ) : (
        <input
          // biome-ignore lint/a11y/noAutofocus: opened by an explicit tap on the name.
          autoFocus
          value={draft}
          maxLength={NAME_MAX}
          aria-label="Your name"
          onChange={(e) => setDraft(e.target.value.replace(/[^A-Za-z0-9_]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setDraft(null);
          }}
          className="h-9 w-32 min-w-0 rounded-full border-2 border-teal bg-ink px-3 font-display text-base text-cream outline-none"
        />
      )}
    </div>
  );
}
