import { CaretDownIcon } from '@phosphor-icons/react';

type Credit = { what: string; by: string; licence: string };

/**
 * The in-game credits (ADR-006; mirrors docs/CREDITS.md). Everything not listed here is ours:
 * the arena, UI, netcode, bots, VRF rounds and the RUCKUS chickens (Meshy Pro output we own).
 */
const GROUPS: readonly { title: string; items: readonly Credit[] }[] = [
  {
    title: 'Art',
    items: [
      { what: 'RUCKUS chickens', by: 'Made with Meshy (Pro)', licence: 'Owned' },
      { what: 'Pixel Adventure characters and tiles', by: 'Pixel Frog', licence: 'CC0' },
      { what: 'Runner mannequin and animations', by: 'Quaternius', licence: 'CC0' },
      { what: 'Billiard Hall HDRI', by: 'Poly Haven (Greg Zaal, Jarod Guest)', licence: 'CC0' },
    ],
  },
  {
    title: 'Sound and music',
    items: [{ what: 'All sound effects and music', by: 'Made with ElevenLabs', licence: 'Owned' }],
  },
  {
    title: 'Open-source code',
    items: [
      { what: 'Pool physics models', by: 'pooltool (ekiefl)', licence: 'Apache-2.0' },
      { what: 'Chickenz fixed-point sim (ported)', by: 'Ash Francis', licence: 'MIT' },
      { what: 'Runner rules and tuning', by: 'KaspaKinesis (peavey2787)', licence: 'MIT' },
      { what: 'UI primitives', by: 'shadcn/ui, 21st.dev', licence: 'MIT' },
    ],
  },
  {
    title: 'Built with',
    items: [
      {
        what: 'three.js, React Three Fiber, React',
        by: 'three.js authors, pmndrs, Meta',
        licence: 'MIT',
      },
      { what: 'Colyseus, Convex', by: 'Colyseus, Convex', licence: 'MIT, Apache-2.0' },
      { what: 'Bungee, Rubik, Silkscreen', by: 'Google Fonts', licence: 'OFL-1.1' },
    ],
  },
];

export function Credits() {
  return (
    <details className="group border-t-2 border-line pt-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg text-cream">
        Credits
        <CaretDownIcon
          weight="bold"
          className="size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 flex flex-col gap-4 text-sm">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h4 className="label-caps mb-1.5 text-xs text-gold">{g.title}</h4>
            <ul className="flex flex-col gap-1.5">
              {g.items.map((c) => (
                <li key={c.what} className="leading-snug">
                  <span className="text-cream">{c.what}</span>
                  <span className="text-cream-dim">
                    {' '}
                    · {c.by} · {c.licence}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-xs text-cream-dim">Full notices ship with the code on GitHub.</p>
      </div>
    </details>
  );
}
