import { Button } from '@/ui/Button.tsx';

import { loadWagerSounds } from './audio.ts';
import { useWager } from './store.ts';

/** Gold is money: the one gold button in the Chickenz cabinet opens the wager sheet. */
export function BackABirdButton() {
  return (
    <Button
      variant="gold"
      size="lg"
      sound="ui.coin"
      onClick={() => {
        void loadWagerSounds();
        useWager.getState().set({ sheetOpen: true });
      }}
    >
      Back a Bird
    </Button>
  );
}
