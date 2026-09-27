import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import { type ReactNode, useState } from 'react';

const PANEL =
  'absolute top-0 left-0 max-h-[calc(100dvh-6rem)] w-[min(22rem,calc(100vw-2rem))] bg-ink/95';

/**
 * The "?" every game keeps one tap away: a round button that opens a how-to-play panel in place.
 * Children may be a function of `close` for a panel with its own dismiss (pool's GOT IT).
 */
export function HelpPanel({
  title = 'HOW TO PLAY',
  defaultOpen = false,
  onClose,
  buttonClassName = '',
  panelClassName = PANEL,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  buttonClassName?: string;
  panelClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(defaultOpen);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  if (!open)
    return (
      <button
        type="button"
        aria-label="How to play"
        onClick={() => setOpen(true)}
        className={`pointer-events-auto grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim ${buttonClassName}`}
      >
        <QuestionIcon weight="bold" className="size-5" />
      </button>
    );
  return (
    <div
      role="dialog"
      aria-label={title}
      className={`pointer-events-auto overflow-y-auto overscroll-contain rounded-2xl border-2 border-teal p-4 text-sm shadow-[0_12px_40px_rgb(0_0_0/0.5)] ${panelClassName}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-teal">{title}</span>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="text-cream-dim hover:text-cream"
        >
          <XIcon weight="bold" className="size-4" />
        </button>
      </div>
      {typeof children === 'function' ? children(close) : children}
    </div>
  );
}
