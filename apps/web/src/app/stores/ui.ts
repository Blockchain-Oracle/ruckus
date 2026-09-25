import { create } from 'zustand';

export type Sheet = 'settings' | null;

type UiState = {
  sheet: Sheet;
  openSheet(sheet: Sheet): void;
};

/** Transient overlay state only; anything worth a URL lives in url-state instead. */
export const useUi = create<UiState>()((set) => ({
  sheet: null,
  openSheet: (sheet) => set({ sheet }),
}));
