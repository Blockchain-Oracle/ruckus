import { create } from 'zustand';

type SessionState = {
  /** Convex guest identity is ready (points and ranks can be recorded). */
  signedIn: boolean;
  displayName: string | null;
  setIdentity(patch: Partial<Pick<SessionState, 'signedIn' | 'displayName'>>): void;
};

export const useSession = create<SessionState>()((set) => ({
  signedIn: false,
  displayName: null,
  setIdentity: (patch) => set(patch),
}));
