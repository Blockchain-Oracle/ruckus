import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'node',
  target: 'node24',
  format: 'esm',
  dts: false,
  // Emit dist/index.js (not .mjs) — nixpacks.toml starts `node apps/server/dist/index.js`.
  fixedExtension: false,
  // Workspace packages ship TS source, so they must be bundled into the server output.
  noExternal: [/^@arena\//],
});
