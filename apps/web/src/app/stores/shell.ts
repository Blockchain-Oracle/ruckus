import { create } from 'zustand';

type ShellState = {
  /** A game presenting its own HUD (e.g. a wager fight) hides the shell's default Back button. */
  gameOwnsHud: boolean;
  /** Full-screen play (a match) hides the hub's logo and balance, like Chickenz's clean HUD. */
  immersive: boolean;
  setGameOwnsHud(owns: boolean): void;
  setImmersive(immersive: boolean): void;
};

export const useShell = create<ShellState>()((set) => ({
  gameOwnsHud: false,
  immersive: false,
  setGameOwnsHud: (gameOwnsHud) => set({ gameOwnsHud }),
  setImmersive: (immersive) => set({ immersive }),
}));
