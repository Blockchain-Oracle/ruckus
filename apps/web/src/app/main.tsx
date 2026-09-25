import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@/styles/global.css';

import { App } from '@/app/App.tsx';
import { Providers } from '@/app/providers.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
