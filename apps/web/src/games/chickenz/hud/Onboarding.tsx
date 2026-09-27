import { Button } from '@/ui/Button.tsx';

import { useOnboarding } from '../tutorial/onboarding.ts';

/** Chickenz's pixel modal frame: dark card, Silkscreen, yellow title. */
function Frame({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/60 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-md border-2 border-line bg-ink-2 p-6 text-center font-pixel shadow-[0_20px_60px_rgb(0_0_0/0.6)]">
        <div
          className="text-xl uppercase text-[#ffee58]"
          style={{ textShadow: '2px 2px 0 #c9a800' }}
        >
          {title}
        </div>
        {body && <p className="text-sm text-cream-dim">{body}</p>}
        {children}
      </div>
    </div>
  );
}

export function Onboarding({ onTutorial, onSkip }: { onTutorial(): void; onSkip(): void }) {
  const stage = useOnboarding((s) => s.stage);

  if (stage === 'prompt') {
    return (
      <Frame title="Looks like you're new here" body="Learn the basics in a quick tutorial.">
        <div className="flex gap-3">
          <Button variant="tomato" sound="ui.confirm" onClick={onTutorial}>
            Play tutorial
          </Button>
          <Button sound="ui.back" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </Frame>
    );
  }
  return null;
}
