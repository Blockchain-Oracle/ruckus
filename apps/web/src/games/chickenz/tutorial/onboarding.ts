import { create } from 'zustand';

/** Chickenz first run: "new here?" prompt → tutorial → username → play. */
export type OnboardingStage = 'none' | 'prompt' | 'tutorial' | 'username';

type OnboardingState = { stage: OnboardingStage; set(stage: OnboardingStage): void };

export const useOnboarding = create<OnboardingState>()((set) => ({
  stage: 'none',
  set: (stage) => set({ stage }),
}));
