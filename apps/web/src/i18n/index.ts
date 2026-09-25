import { useCasinoBridge } from '@/lib/casino/useCasinoBridge.ts';

import { type Catalog, en, type MessageKey } from './en.ts';

/** Only English ships for the jam; the host's `ui.locale` still picks from whatever exists. */
const CATALOGS: Record<string, Catalog> = { en };
const FALLBACK = 'en';

export const catalogFor = (locale: string | undefined): Catalog => {
  const lang = locale?.toLowerCase().split('-')[0] ?? FALLBACK;
  return CATALOGS[lang] ?? en;
};

export function useT(): (key: MessageKey) => string {
  const locale = useCasinoBridge().snapshot?.ui.locale;
  const catalog = catalogFor(locale);
  return (key) => catalog[key];
}

export type { MessageKey };
