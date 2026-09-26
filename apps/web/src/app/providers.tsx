import { ConvexAuthProvider } from '@convex-dev/auth/react';
import type { ReactNode } from 'react';

import { safeTokenStorage } from '@/app/stores/safeStorage.ts';
import { convex } from '@/lib/convex/client.ts';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} storage={safeTokenStorage}>
      {children}
    </ConvexAuthProvider>
  );
}
