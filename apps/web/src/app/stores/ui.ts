import { create } from 'zustand';

export type Sheet = 'settings' | 'games' | null;

type UiState = {
  sheet: Sheet;
  sheetEverOpened: boolean;
  switcherEverOpened: boolean;
  openSheet(sheet: Sheet): void;
};

/** Transient overlay state only; anything worth a URL lives in url-state instead. */
export const useUi = create<UiState>()((set) => ({
  sheet: null,
  sheetEverOpened: false,
  switcherEverOpened: false,
  openSheet: (sheet) =>
    set((s) => ({
      sheet,
      sheetEverOpened: s.sheetEverOpened || sheet === 'settings',
      switcherEverOpened: s.switcherEverOpened || sheet === 'games',
    })),
}));
