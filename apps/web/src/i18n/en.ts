/** English catalog. Keys are dotted by screen; other locales must satisfy `typeof en`. */
export const en = {
  'hub.play': 'Play',
  'hub.quickPlay': 'Quick Play',
  'hub.practice': 'Practice',
  'hub.back': 'Back',
  'hub.welcome.title': 'Play with friends',
  'hub.welcome.body': 'Party games you can drop into in seconds. No sign-up, no wallet to play.',
  'hub.pickGame': 'Pick a cabinet',
  'hub.players': 'players',
  'balance.demo': 'DEMO',
  'balance.demoNote': 'Demo credits, no value',
  'balance.connecting': 'Connecting…',
  'settings.title': 'Settings',
  'settings.music': 'Music',
  'settings.sfx': 'Sound effects',
  'settings.ui': 'Interface sounds',
  'settings.mute': 'Mute all',
  'settings.reducedMotion': 'Reduce motion',
  'settings.haptics': 'Vibration',
  'games.chickenz.tagline': 'Four birds, one arena. Last chicken standing.',
} as const;

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;
