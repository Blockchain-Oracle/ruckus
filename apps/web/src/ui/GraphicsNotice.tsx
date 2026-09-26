import { ArrowClockwiseIcon, MonitorIcon } from '@phosphor-icons/react';

import { useShell } from '@/app/stores/shell.ts';
import { useT } from '@/i18n/index.ts';

import { Button } from './Button.tsx';

/**
 * Shown when the browser can't give us WebGPU or WebGL2 at all: almost always Chrome with
 * "Use graphics acceleration" off, or a GPU it blocklists. The hub stays usable; the games can't.
 */
export function GraphicsNotice() {
  const t = useT();
  const failed = useShell((s) => s.graphicsFailed);
  if (!failed) return null;
  return (
    <div
      role="alert"
      className="pointer-events-auto fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-lg flex-col gap-3 rounded-[var(--radius-card)] border-2 border-warn bg-ink-2 p-4 shadow-[0_18px_50px_rgb(0_0_0/0.6)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <MonitorIcon weight="bold" className="mt-0.5 size-6 shrink-0 text-warn" />
        <div className="min-w-0">
          <p className="font-display text-xl text-cream">{t('graphics.title')}</p>
          <p className="mt-1 text-sm leading-snug text-cream-dim">{t('graphics.body')}</p>
        </div>
      </div>
      <Button variant="ink" size="sm" sound="ui.confirm" onClick={() => window.location.reload()}>
        <ArrowClockwiseIcon weight="bold" /> {t('graphics.reload')}
      </Button>
    </div>
  );
}
