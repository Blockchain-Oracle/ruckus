import { create } from 'zustand';

type ShellState = {
  /** A game presenting its own HUD (e.g. a wager fight) hides the shell's default Back button. */
  gameOwnsHud: boolean;
  /** Full-screen play (a match) hides the hub's logo and balance, like Chickenz's clean HUD. */
  immersive: boolean;
  /** A deep link's game is loading: the landing stays hidden instead of flashing first. */
  booting: boolean;
  /** Neither WebGPU nor WebGL2 would start: the hub still works, the canvas can't. */
  graphicsFailed: boolean;
  setGameOwnsHud(owns: boolean): void;
  setImmersive(immersive: boolean): void;
};

export const useShell = create<ShellState>()((set) => ({
  gameOwnsHud: false,
  immersive: false,
  booting: false,
  graphicsFailed: false,
  setGameOwnsHud: (gameOwnsHud) => set({ gameOwnsHud }),
  setImmersive: (immersive) => set({ immersive }),
}));
