/** English catalog. Keys are dotted by screen; other locales must satisfy `typeof en`. */
export const en = {
  'hub.play': 'Play',
  'hub.quickPlay': 'Quick Play',
  'hub.practice': 'Practice',
  'hub.back': 'Back',
  'hub.welcome.title': 'Play with friends',
  'hub.welcome.body': 'Party games you can drop into in seconds. No sign-up, no wallet to play.',
  'hub.pickGame': 'Pick a cabinet',
  'hub.arena.title': 'Four games. One arena.',
  'hub.arena.body':
    'Play friends, strangers or bots for free, online or right here. Every game also has a VRF round you can call.',
  'hub.arena.online': 'Online',
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
  'games.pool.tagline': 'Real cloth, real spin. Sink your group, call the 8.',
  'games.soccer.tagline': 'Big heads, no mercy. Head it, bounce it, bury it in 90 seconds.',
  'games.runner.tagline':
    'Three lanes, one neon city, four racers. The colour tells you what to do.',
} as const;

export type MessageKey = keyof typeof en;
export type Catalog = Record<MessageKey, string>;
