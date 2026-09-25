import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils.ts';
import { Button } from '@/ui/Button.tsx';
import { Switch } from '@/ui/primitives/switch.tsx';

import { replayTutorial, tutorialReplayable } from '../flow.ts';
import { ACTIONS, type Action, keyName, useChickenzPrefs } from '../prefs.ts';
import { HERO_NAMES, HEROES } from '../sprites.ts';
import { HeroPortrait } from '../wager/HeroPortrait.tsx';

const ACTION_LABELS = {
  left: 'Move left',
  right: 'Move right',
  jump: 'Jump',
  shoot: 'Shoot',
  taunt: 'Taunt',
} as const satisfies Record<Action, string>;

/** Modifier keys alone never bind (`SettingsPanel.ts:226`). */
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/** What a mouse press is followed by: left clicks, right opens the menu, others auxclick. */
const FOLLOW_UP = { 0: 'click', 2: 'contextmenu' } as const;

type Listening = { action: Action; slot: 0 | 1 } | null;

/** Chickenz's settings panel, minus what the hub already owns (volumes, name). */
export function ChickenzSettings() {
  const { bindings, dynamicCamera, hero, bind, resetBindings, set } = useChickenzPrefs();
  const [listening, setListening] = useState<Listening>(null);
  useRebindCapture(listening, (code) => {
    if (listening && code) bind(listening.action, listening.slot, code);
    setListening(null);
  });

  return (
    <section className="flex flex-col gap-5 border-t-2 border-line pt-5">
      <h3 className="font-display text-lg text-cream">Chickenz</h3>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-2">Your bird</legend>
        <div className="flex gap-2">
          {HEROES.map((h) => (
            <label
              key={h}
              title={HERO_NAMES[h]}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 p-1.5 has-focus-visible:outline-2 has-focus-visible:outline-cream',
                hero === h ? 'border-tomato bg-ink-3' : 'border-transparent hover:border-line',
              )}
            >
              <input
                type="radio"
                name="chickenz-hero"
                className="sr-only"
                checked={hero === h}
                onChange={() => set({ hero: h })}
              />
              <HeroPortrait hero={h} className="w-10" />
              <span className="font-pixel text-[9px] uppercase text-cream-dim">
                {HERO_NAMES[h]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label
        htmlFor="chickenz-dynamic-camera"
        className="flex items-center justify-between text-sm"
      >
        <span>
          Dynamic camera
          <span className="block text-xs text-cream-dim">Off shows the whole arena</span>
        </span>
        <Switch
          id="chickenz-dynamic-camera"
          checked={dynamicCamera}
          onCheckedChange={(v) => set({ dynamicCamera: v })}
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Controls</span>
          <button
            type="button"
            onClick={resetBindings}
            className="text-xs text-cream-dim underline-offset-2 hover:text-cream hover:underline"
          >
            Reset defaults
          </button>
        </div>
        <table className="w-full border-separate border-spacing-y-1.5">
          <tbody>
            {ACTIONS.map((action) => (
              <tr key={action}>
                <th scope="row" className="text-left font-normal text-cream-dim">
                  {ACTION_LABELS[action]}
                </th>
                {([0, 1] as const).map((slot) => {
                  const active = listening?.action === action && listening.slot === slot;
                  return (
                    <td key={slot} className="w-24 pl-2">
                      <button
                        type="button"
                        aria-label={`${ACTION_LABELS[action]}, key ${slot + 1}: ${keyName(bindings[action][slot])}. Click to change`}
                        onClick={() => setListening({ action, slot })}
                        className={cn(
                          'font-pixel h-9 w-full rounded-md border-2 text-[10px] uppercase transition-colors',
                          active
                            ? 'animate-pulse border-[#ffee58] bg-ink text-[#ffee58]'
                            : 'border-line bg-ink-3 text-cream hover:border-cream-dim',
                        )}
                      >
                        {active ? '...' : keyName(bindings[action][slot])}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-cream-dim" aria-live="polite">
          {listening ? 'Press a key or mouse button. Esc cancels.' : 'Click a key to change it.'}
        </p>
      </div>

      <Button size="sm" disabled={!tutorialReplayable()} onClick={replayTutorial}>
        Replay tutorial
      </Button>
    </section>
  );
}

/**
 * While listening, the next key or mouse button binds (capture phase, so neither the game nor the
 * sheet's own Esc/outside-click handling sees it). `''` means cancelled.
 */
function useRebindCapture(listening: Listening, onDone: (code: string) => void) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!listening) return;
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      swallow(e);
      if (MODIFIERS.has(e.key)) return;
      done.current(e.code === 'Escape' ? '' : e.code);
    };
    const onPointer = (e: PointerEvent) => {
      swallow(e);
      if (e.pointerType !== 'mouse') return done.current('');
      // The press's own follow-up event must not re-open listening or pop the context menu.
      const followUp = FOLLOW_UP[e.button as keyof typeof FOLLOW_UP] ?? 'auxclick';
      window.addEventListener(followUp, swallow, { capture: true, once: true });
      done.current(`Mouse${e.button}`);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    window.addEventListener('pointerdown', onPointer, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      window.removeEventListener('pointerdown', onPointer, { capture: true });
    };
  }, [listening]);
}
