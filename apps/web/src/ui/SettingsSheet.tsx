import { useSettings } from '@/app/stores/settings.ts';
import { useUi } from '@/app/stores/ui.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import { getLoadedGame } from '@/games/loader.ts';
import type { MessageKey } from '@/i18n/index.ts';
import { useT } from '@/i18n/index.ts';
import { Credits } from '@/ui/Credits.tsx';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/primitives/sheet.tsx';
import { Slider } from '@/ui/primitives/slider.tsx';
import { Switch } from '@/ui/primitives/switch.tsx';

const PERCENT = 100;
const VOLUMES = [
  ['musicVolume', 'settings.music'],
  ['sfxVolume', 'settings.sfx'],
  ['uiVolume', 'settings.ui'],
] as const satisfies readonly (readonly [string, MessageKey])[];
const TOGGLES = [
  ['muted', 'settings.mute'],
  ['reducedMotion', 'settings.reducedMotion'],
  ['haptics', 'settings.haptics'],
] as const satisfies readonly (readonly [string, MessageKey])[];

export function SettingsSheet() {
  const t = useT();
  const open = useUi((s) => s.sheet === 'settings');
  const openSheet = useUi((s) => s.openSheet);
  const settings = useSettings();
  const GameSettings = getLoadedGame(useGameMachine((s) => s.gameId))?.Settings;

  return (
    <Sheet open={open} onOpenChange={(o) => openSheet(o ? 'settings' : null)}>
      <SheetContent className="border-line bg-ink-2 text-cream">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-cream">
            {t('settings.title')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-24">
          {VOLUMES.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-2 text-sm">
              <span className="flex justify-between">
                <span id={`setting-${key}`}>{t(label)}</span>
                <span className="tabular text-cream-dim">
                  {Math.round(settings[key] * PERCENT)}%
                </span>
              </span>
              <Slider
                value={[settings[key] * PERCENT]}
                max={PERCENT}
                step={1}
                aria-labelledby={`setting-${key}`}
                onValueChange={([v = 0]) => settings.set({ [key]: v / PERCENT })}
              />
            </div>
          ))}
          {TOGGLES.map(([key, label]) => (
            <label
              key={key}
              htmlFor={`setting-${key}`}
              className="flex items-center justify-between text-sm"
            >
              {t(label)}
              <Switch
                id={`setting-${key}`}
                checked={settings[key]}
                onCheckedChange={(v) => settings.set({ [key]: v })}
              />
            </label>
          ))}
          {GameSettings && <GameSettings />}
          <Credits />
        </div>
      </SheetContent>
    </Sheet>
  );
}
