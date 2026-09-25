import { create } from 'zustand';

type RoomSheetState = { open: boolean; setOpen(open: boolean): void };

export const useRoomSheet = create<RoomSheetState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
