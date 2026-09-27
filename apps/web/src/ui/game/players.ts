/**
 * The four player colours (ART-BIBLE), in seat order. Mirrors `--tomato`, `--teal`, `--player-3`
 * and `--player-4` in styles/tokens.css: scenes need them as values, the DOM as tokens.
 */
export const PLAYERS = [
  { color: '#ff5a36', name: 'Tomato' },
  { color: '#2ec4b6', name: 'Teal' },
  { color: '#8c6bff', name: 'Violet' },
  { color: '#9be15d', name: 'Lime' },
] as const;

export const PLAYER_COLORS = PLAYERS.map((p) => p.color);
