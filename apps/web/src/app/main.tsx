import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/global.css';

import { App } from '@/app/App.tsx';
import { Providers } from '@/app/providers.tsx';
import { startCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';
import { blockPageZoom } from '@/lib/noPageZoom.ts';
import { flagIosBrowserBars } from '@/lib/platform.ts';
import { ErrorBoundary } from '@/ui/ErrorBoundary.tsx';

// Start the host handshake immediately; it races the ~3 s demo fallback, not React.
void startCasinoBridge();
blockPageZoom();
flagIosBrowserBars();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

/** Plain markup on purpose: i18n or the providers may be what broke. Beats a blank backdrop. */
const crashed = (
  <div className="grid min-h-dvh place-items-center p-6 text-center">
    <div className="flex max-w-sm flex-col items-center gap-4">
      <p className="font-display text-3xl text-cream">Something broke</p>
      <p className="text-cream-dim">RUCKUS hit an error loading. A reload usually fixes it.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-tomato px-6 py-3 font-display text-lg text-cream"
      >
        Reload
      </button>
    </div>
  </div>
);

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary fallback={crashed}>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
