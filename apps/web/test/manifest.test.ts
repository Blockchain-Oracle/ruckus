import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { canonicalCasinoGameId, validateCasinoGameManifest } from '@chain/casino-sdk';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../public/game.manifest.json'), 'utf8'),
);

describe('game.manifest.json', () => {
  it('passes host validation', () => {
    expect(validateCasinoGameManifest(manifest).ok).toBe(true);
  });

  it('gameId matches the RuckusGame contract canonical id', () => {
    expect(manifest.gameId).toBe(canonicalCasinoGameId('RuckusGame'));
  });
});
