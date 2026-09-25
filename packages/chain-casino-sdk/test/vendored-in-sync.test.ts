import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const UPSTREAM_SRC = resolve(import.meta.dirname, '../../../casino-sdk/src');
const VENDORED_SRC = resolve(import.meta.dirname, '../src');

describe('vendored @chain/casino-sdk', () => {
  const upstreamFiles = readdirSync(UPSTREAM_SRC).filter(
    (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'),
  );

  it.each(upstreamFiles)('%s matches casino-sdk/src byte for byte', (file) => {
    expect(readFileSync(resolve(VENDORED_SRC, file), 'utf8')).toBe(
      readFileSync(resolve(UPSTREAM_SRC, file), 'utf8'),
    );
  });
});
