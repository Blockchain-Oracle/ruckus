const KEY = 'ruckus.soccer.controlsSeen';

/** First visit shows How to play before kickoff; after that it's one tap away. */
export function controlsSeen() {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
export function markControlsSeen() {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    /* shown again next visit */
  }
}
