import { create } from 'zustand';

/** Chickenz first run: "new here?" prompt → tutorial → play (names are asked in the lobby). */
export type OnboardingStage = 'none' | 'prompt' | 'tutorial';

type OnboardingState = { stage: OnboardingStage; set(stage: OnboardingStage): void };

export const useOnboarding = create<OnboardingState>()((set) => ({
  stage: 'none',
  set: (stage) => set({ stage }),
}));
