import { ArrowLeftIcon, GearSixIcon } from '@phosphor-icons/react';

import { COUNTDOWN_S, TICK_HZ } from '@arena/sim-runner';

import { useUi } from '@/app/stores/ui.ts';
import { FullscreenButton } from '@/ui/FullscreenButton.tsx';
import { useCoarse } from '@/ui/game/useCoarse.ts';

import { currentChallenge, startChallenge, startLessons, startRace } from '../match/flow.ts';
import { getDriver } from '../match/runtime.ts';
import { useRunner } from '../match/store.ts';
import { raceClock, shareChallenge } from '../net/challenge.ts';
import { Announce, Flash } from './Announce.tsx';
import { ControlsButton, IntroCard } from './Controls.tsx';
import { CoinsAndSpeed, PowerChip, ProgressRail, Standings } from './Gauges.tsx';
import { LessonCard } from './Lesson.tsx';
import { Results } from './Results.tsx';
import { useTick } from './useTick.ts';

const HUD_HZ = 15;

/** Racing a friend's ghost, "Race again" means that same ghost again. */
const rematch = () => {
  const c = currentChallenge();
  if (c) startChallenge(c);
  else startRace();
};

function challengeFriend(name: string) {
  const d = getDriver();
  const me = d?.world.runners[d.humanSlot];
  if (!d || !me || me.finished < 0) return;
  void shareChallenge(d.recording(), name, raceClock(me.finished - COUNTDOWN_S * TICK_HZ));
}
/** The control reminder stays up for the opening seconds of each race. */
const HINT_TICKS = 18 * TICK_HZ;
const roundBtn =
  'pointer-events-auto grid size-10 place-items-center rounded-full border-2 border-line bg-ink/85 text-cream hover:border-cream-dim';

export function RunnerHud({ onLeave }: { onLeave: () => void }) {
  useTick(HUD_HZ);
  const status = useRunner((s) => s.status);
  const names = useRunner((s) => s.names);
  const online = useRunner((s) => s.online);
  const coarse = useCoarse();
  const d = getDriver();
  if (status === 'off' || !d) return null;
  if (status === 'intro') return <IntroCard onGo={startRace} onLearn={startLessons} />;
  const lessons = status === 'tutorial';
  const w = d.world;
  // Watchers follow whoever the camera rides with.
  const you = d.humanSlot >= 0 ? d.humanSlot : d.focus;
  // Lessons carry their own instruction card; the key reminder is for races.
  const hint = status === 'playing' && w.tick < HINT_TICKS;

  return (
    <div className="pointer-events-none hud-frame">
      <Flash />
      {lessons ? (
        <LessonCard />
      ) : (
        <>
          <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-16 [@media(pointer:fine)]:top-4">
            <ProgressRail w={w} you={you} />
            <PowerChip w={w} you={you} />
          </div>
          <div className="absolute top-28 left-3 sm:left-8 [@media(max-height:500px)]:top-16 [@media(max-height:500px)]:left-16">
            <CoinsAndSpeed w={w} you={you} />
          </div>
          <div className="absolute top-28 right-3 sm:right-8 [@media(max-height:500px)]:top-16 [@media(max-height:500px)]:right-16">
            <Standings w={w} you={you} names={names} />
          </div>
        </>
      )}
      <Announce />

      <div
        className="absolute inset-x-0 bottom-5 px-4 text-center text-xs text-cream transition-opacity duration-700 [text-shadow:1px_1px_0_#000] [@media(pointer:coarse)]:bottom-16"
        style={{ opacity: hint ? 0.9 : 0 }}
      >
        {coarse
          ? 'Swipe ← → change lane · ↑ jump · ↓ slide (in the air: slam down)'
          : 'A / D or ← → change lane · W, ↑ or Space jump · hold S or ↓ to slide (in the air: slam down)'}
      </div>

      <button
        type="button"
        aria-label="Leave race"
        title="Leave race"
        onClick={onLeave}
        className={`${roundBtn} absolute top-3 left-3 sm:left-8 [@media(pointer:fine)]:top-4`}
      >
        <ArrowLeftIcon weight="bold" className="size-5" />
      </button>
      <div className="absolute top-16 left-3 sm:left-8 [@media(max-height:500px)]:top-3 [@media(max-height:500px)]:left-16 [@media(pointer:fine)]:top-[4.25rem]">
        <ControlsButton />
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-2 sm:right-8 [@media(max-height:500px)]:flex-row-reverse [@media(pointer:fine)]:top-4">
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

      {status === 'over' && !useRunner.getState().announce && (
        <Results
          w={w}
          you={d.humanSlot}
          names={names}
          online={online}
          onRematch={rematch}
          onLeave={onLeave}
          onChallenge={online ? undefined : () => challengeFriend(names[you] ?? 'A friend')}
        />
      )}
    </div>
  );
}
