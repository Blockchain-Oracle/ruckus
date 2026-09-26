import { CoinsIcon, GlobeIcon, PlayIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { m } from 'motion/react';
import { useEffect, useRef } from 'react';

import { loadGame } from '@/games/loader.ts';
import { type GAMES, visibleGames } from '@/games/registry.ts';
import { useT } from '@/i18n/index.ts';
import { uiSound } from '@/lib/audio/index.ts';

const ENTER = { duration: 0.35, ease: [0.22, 1, 0.36, 1] } as const;
const STAGGER_S = 0.06;

type Game = (typeof GAMES)[number];

/**
 * A card's footage: the poster paints at once; the loop plays only while the card is on screen
 * (phones stack the cards), and never for reduced-motion viewers.
 */
function Preview({ game }: { game: Game }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Fetch a screen ahead: phones stack the cards, and a clip that only starts downloading once
    // it is on screen shows its poster for seconds on mobile data.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        v.preload = 'auto';
        near.disconnect();
      },
      { rootMargin: '100% 0px' },
    );
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 },
    );
    near.observe(v);
    io.observe(v);
    return () => {
      near.disconnect();
      io.disconnect();
    };
  }, []);
  return (
    <video
      ref={ref}
      className="aspect-video w-full bg-ink object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      poster={game.preview.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
    >
      <source src={game.preview.webm} type="video/webm" />
      <source src={game.preview.mp4} type="video/mp4" />
    </video>
  );
}

/**
 * The arena's front door: every cabinet with its real footage, what it is, and its VRF round.
 * Choosing one dollies the camera into that game's live attract, where Play lives.
 */
export function ArenaLanding({ onChoose }: { onChoose: (id: Game['id']) => void }) {
  const t = useT();
  const games = visibleGames();
  return (
    <div
      data-arena-landing
      className="pointer-events-auto absolute inset-0 overflow-y-auto overscroll-contain bg-[radial-gradient(120%_80%_at_50%_0%,#2a1650_0%,#1b1024_55%,#120a1a_100%)]"
    >
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center gap-5 px-4 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] pb-[max(4.5rem,env(safe-area-inset-bottom))] sm:gap-7 sm:px-8 [@media(max-height:480px)]:gap-3 [@media(max-height:480px)]:pt-16">
        <m.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: ENTER }}
          className="max-w-2xl"
        >
          <h1 className="font-display text-4xl leading-tight sm:text-5xl [@media(max-height:480px)]:text-3xl">
            {t('hub.arena.title')}
          </h1>
          <p className="mt-2 text-base text-cream-dim sm:text-lg [@media(max-height:480px)]:hidden">
            {t('hub.arena.body')}
          </p>
        </m.header>
        <nav
          aria-label={t('hub.pickGame')}
          className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-4 [@media(max-height:480px)]:grid-cols-4 [@media(max-height:480px)]:gap-3"
        >
          {games.map((g, i) => (
            <m.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0, transition: { ...ENTER, delay: 0.08 + i * STAGGER_S } }}
              onClick={() => {
                uiSound('ui.confirm');
                onChoose(g.id);
              }}
              onPointerEnter={() => void loadGame(g.id)}
              onFocus={() => void loadGame(g.id)}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-ink-3 text-left shadow-[0_14px_40px_rgb(0_0_0/0.45)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-tomato hover:shadow-[0_0_0_3px_rgb(255_90_54/0.35),0_18px_50px_rgb(0_0_0/0.55)] focus-visible:border-tomato focus-visible:outline-none"
            >
              <div className="relative overflow-hidden">
                <Preview game={g} />
                <span className="absolute right-2 bottom-2 grid size-10 place-items-center rounded-full bg-tomato text-cream opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100">
                  <PlayIcon weight="fill" className="size-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4 [@media(max-height:480px)]:gap-1 [@media(max-height:480px)]:p-2.5">
                <span className="font-display text-xl text-cream [@media(max-height:480px)]:text-base">
                  {g.title}
                </span>
                <span className="text-sm leading-snug text-cream-dim [@media(max-height:480px)]:hidden">
                  {t(g.taglineKey)}
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
                  <span className="font-pixel label-caps inline-flex items-center gap-1.5 text-teal">
                    <UsersThreeIcon weight="bold" className="size-3.5" />
                    {g.players}
                  </span>
                  <span className="inline-flex items-center gap-1 text-cream-dim [@media(max-height:480px)]:hidden">
                    <GlobeIcon weight="bold" className="size-3.5" />
                    {t('hub.arena.online')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gold [@media(max-height:480px)]:hidden">
                    <CoinsIcon weight="bold" className="size-3.5" />
                    {g.wager}
                  </span>
                </span>
              </div>
            </m.button>
          ))}
        </nav>
      </div>
    </div>
  );
}
