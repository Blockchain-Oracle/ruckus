import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { useEffect, useRef } from 'react';

/**
 * Zero-friction identity: the first visit silently creates an anonymous Convex account; later visits
 * reuse the stored token. Nothing is ever asked of the player here (requirements: no sign-in to play).
 */
export function useGuestSession(): { isLoading: boolean; isAuthenticated: boolean } {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const requested = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || requested.current) return;
    requested.current = true;
    void signIn('anonymous').catch(() => {
      requested.current = false; // allow a retry on the next render (e.g. network blip)
    });
  }, [isLoading, isAuthenticated, signIn]);

  return { isLoading, isAuthenticated };
}
