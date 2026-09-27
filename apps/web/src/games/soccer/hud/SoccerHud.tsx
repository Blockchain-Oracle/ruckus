import { ArrowLeftIcon, GearSixIcon } from '@phosphor-icons/react';

import { MATCH_SECONDS, TICK_HZ } from '@arena/sim-soccer';

import { useUi } from '@/app/stores/ui.ts';
import { FullscreenButton } from '@/ui/FullscreenButton.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { startLessons, startMatch } from '../match/flow.ts';
import { getDriver } from '../match/runtime.ts';
import { useSoccer } from '../match/store.ts';
import { Announce } from './Announce.tsx';
import { ControlsButton, IntroCard } from './Controls.tsx';
import { LessonCard } from './Lesson.tsx';
import { Results } from './Results.tsx';
import { PowerChips, ScoreBug } from './ScoreBug.tsx';
import { TouchPad } from './TouchPad.tsx';
import { useTick } from './useTick.ts';

const HUD_HZ = 12;
/** The key reminder stays up for the opening seconds, until the first goal. */
const HINT_S = 20;
const roundBtn =
  'pointer-events-auto grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim';

export function SoccerHud({ onLeave }: { onLeave: () => void }) {
  useTick(HUD_HZ);
  const status = useSoccer((s) => s.status);
  const names = useSoccer((s) => s.names);
  const online = useSoccer((s) => s.online);
  const coarse = useCoarse();
  const d = getDriver();
  if (status === 'off' || !d) return null;
  if (status === 'intro') return <IntroCard onGo={startMatch} onLearn={startLessons} />;
  const lessons = status === 'tutorial';
  const w = d.world;
  const you = d.humanSlot;
  const firstMinute = w.clock > (MATCH_SECONDS - HINT_S) * TICK_HZ && w.score[0] + w.score[1] === 0;

  return (
    <div className="pointer-events-none hud-frame">
      <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-16 [@media(pointer:fine)]:top-4">
        {!lessons && <ScoreBug w={w} names={names} you={you} />}
        {!lessons && <PowerChips w={w} />}
      </div>
      <Announce />
      <LessonCard />

      {!coarse && (
        <div
          className="absolute inset-x-0 bottom-5 text-center text-xs text-cream transition-opacity duration-700 [text-shadow:1px_1px_0_#000]"
          style={{ opacity: (firstMinute && status === 'playing') || lessons ? 0.9 : 0 }}
        >
          A / D or ← → move · W, ↑ or Space jump (hold for higher) · run into the ball to kick
        </div>
      )}
      {coarse && (status === 'playing' || lessons) && <TouchPad />}

      <button
        type="button"
        aria-label="Leave match"
        title="Leave match"
        onClick={onLeave}
        className={`${roundBtn} absolute top-3 left-3 sm:left-8 [@media(pointer:fine)]:top-4`}
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="absolute top-16 left-3 sm:left-8 [@media(pointer:fine)]:top-[4.25rem]">
        <ControlsButton />
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-2 sm:right-8 [@media(pointer:fine)]:top-4">
        <button
          type="button"
          aria-label="Settings"
          onClick={() => useUi.getState().openSheet('settings')}
          className={roundBtn}
        >
          <GearSixIcon weight="bold" className="size-5" />
        </button>
        <FullscreenButton className="bg-ink/85" />
      </div>

      {status === 'over' && !useSoccer.getState().announce && (
        <Results w={w} you={you} online={online} onRematch={startMatch} onLeave={onLeave} />
      )}
    </div>
  );
}
