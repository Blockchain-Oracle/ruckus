import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerGapIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** The hub is dark-only (Art Bible), so toasts don't follow the host theme. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    className="toaster group"
    icons={{
      success: <CheckCircleIcon weight="fill" className="size-4" />,
      info: <InfoIcon weight="bold" className="size-4" />,
      warning: <WarningIcon weight="fill" className="size-4" />,
      error: <XCircleIcon weight="fill" className="size-4" />,
      loading: <SpinnerGapIcon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--ink-2)',
        '--normal-text': 'var(--cream)',
        '--normal-border': 'var(--line)',
        '--border-radius': 'var(--radius-card)',
      } as CSSProperties
    }
    {...props}
  />
);

export { Toaster };
